import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getRuntimeSecret } from "@/lib/auth";
import { computeCertificateVerificationHash } from "@/lib/exam-rules";
import { CertificateView } from "@/components/certificate-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `گواهینامه ${decodeURIComponent(code)} | آکادمی نیله`,
    robots: { index: false, follow: false },
  };
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cleanCode = decodeURIComponent(code).trim();

  const cert = await db.courseCertificate.findUnique({
    where: { certificateCode: cleanCode },
    include: {
      course: { select: { slug: true } },
    },
  });

  if (!cert) {
    return (
      <CertificateView
        data={{
          found: false,
          valid: false,
          revoked: false,
          certificateCode: cleanCode,
          studentName: "",
          studentNameEn: null,
          courseTitle: "",
          courseTitleEn: null,
          courseSlug: "",
          scorePercent: 0,
          durationHrs: 0,
          issuedAt: new Date().toISOString(),
        }}
      />
    );
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

  return (
    <CertificateView
      data={{
        found: true,
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
      }}
    />
  );
}
