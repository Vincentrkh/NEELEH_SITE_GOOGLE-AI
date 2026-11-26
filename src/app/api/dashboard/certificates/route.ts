import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const user = await requirePermission("course.update");
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    certificateId?: string;
    revoked?: boolean;
  };
  if (!body.certificateId) {
    return NextResponse.json({ error: "certificateId required" }, { status: 400 });
  }

  await db.courseCertificate.update({
    where: { id: body.certificateId },
    data: {
      revokedAt: body.revoked ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true });
}
