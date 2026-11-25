import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getApiLang } from "@/lib/i18n";

export async function POST(req: NextRequest) {
  const lang = await getApiLang();
  const user = await getCurrentUser();
  const body = (await req.json().catch(() => ({}))) as {
    scope?: string;
    granted?: boolean;
  };
  const scope = (body.scope ?? "COURSE_GUIDE").trim();
  const granted = body.granted !== false;

  if (!user) {
    return NextResponse.json({ ok: true, persisted: false, scope, granted });
  }

  const record = await db.aIConsentRecord.create({
    data: {
      subjectId: user.id,
      scope,
      granted,
    },
  });

  return NextResponse.json({
    ok: true,
    persisted: true,
    id: record.id,
    scope,
    granted,
    message: lang === "fa" ? "تنظیمات رضایت هوش مصنوعی ثبت شد" : "AI consent preference saved",
  });
}
