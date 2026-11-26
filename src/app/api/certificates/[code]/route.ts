import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRuntimeSecret } from "@/lib/auth";
import { computeCertificateVerificationHash } from "@/lib/exam-rules";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const cleanCode = decodeURIComponent(code).trim();
  const cert = await db.courseCertificate.findUnique({
    where: { certificateCode: cleanCode },
    include: {
      course: { select: { slug: true, tier: true, category: true, categoryEn: true } },
    },
  });

  if (!cert) {
    return NextResponse.json({ valid: false, error: "Certificate not found" }, { status: 404 });
  }

  const expectedHash = computeCertificateVerificationHash(
    {
      certificateCode: cert.certificateCode,
      studentId: cert.studentId,
      courseId: cert.courseId,
      scorePercent: cert.scorePercent,
    },
    getRuntimeSecret(),
  );

  const hashValid = expectedHash === cert.verificationHash;
  const valid = !cert.revokedAt && hashValid;

  return NextResponse.json({
    valid,
    revoked: Boolean(cert.revokedAt),
    certificateCode: cert.certificateCode,
    studentName: cert.studentName,
    studentNameEn: cert.studentNameEn,
    courseTitle: cert.courseTitle,
    courseTitleEn: cert.courseTitleEn,
    courseSlug: cert.course.slug,
    scorePercent: cert.scorePercent,
    durationHrs: cert.durationHrs,
    issuedAt: cert.issuedAt.toISOString(),
  });
}
