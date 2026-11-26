import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { getApiLang } from "@/lib/i18n";
import { executeSectionAI } from "@/lib/ai/connections";
import { sanitizeRetrievedContext } from "@/lib/domain/academy-rules";

export const dynamic = "force-dynamic";

type HistoryItem = {
  role?: "user" | "assistant";
  content?: string;
};

export async function POST(req: NextRequest) {
  const user = await requirePermission("automation.manage");
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const lang = await getApiLang();
  const body = (await req.json().catch(() => ({}))) as {
    message?: string;
    history?: HistoryItem[];
  };
  const message = (body.message ?? "").trim();
  if (!message || message.length > 3000) {
    return NextResponse.json(
      { error: lang === "fa" ? "متن پیام معتبر نیست." : "Invalid message." },
      { status: 400 },
    );
  }

  const [coursesCount, regPending, regConfirmed, leadsNew, certsCount, examsCount] =
    await Promise.all([
      db.course.count({ where: { published: true } }),
      db.registration.count({ where: { status: "PENDING" } }),
      db.registration.count({ where: { status: "CONFIRMED" } }),
      db.lead.count({ where: { status: "NEW" } }),
      db.courseCertificate.count({ where: { revokedAt: null } }),
      db.courseExam.count({ where: { isPublished: true } }),
    ]);

  const recentCourses = await db.course.findMany({
    where: { published: true },
    take: 9,
    orderBy: { sortOrder: "asc" },
    select: { title: true, titleEn: true, slug: true, regStatus: true, durationHrs: true },
  });

  const historyLines = Array.isArray(body.history)
    ? body.history
        .slice(-6)
        .map((h) => `${h.role === "assistant" ? "Assistant" : "Admin"}: ${sanitizeRetrievedContext(h.content ?? "")}`)
        .join("\n")
    : "";

  const liveFacts = [
    `Published courses: ${coursesCount}`,
    `Confirmed registrations: ${regConfirmed}, Pending review: ${regPending}`,
    `New consultation leads: ${leadsNew}`,
    `Active course exams: ${examsCount}, Issued certificates: ${certsCount}`,
    `Courses: ${recentCourses
      .map((c) => `${lang === "fa" ? c.title : c.titleEn || c.title} (${c.slug}, ${c.durationHrs}h, ${c.regStatus})`)
      .join(" | ")}`,
  ].join("\n");

  const systemInstruction =
    lang === "fa"
      ? "شما دستیار عملیاتی مدیر در آکادمی معماری نیله هستید. بر اساس آمار لحظه‌ای و واقعیت‌های سیستم پاسخ کوتاه، دقیق و کاربردی به فارسی بنویسید و در صورت نیاز مسیرهای پنل (/dashboard/registrations، /dashboard/exams، /dashboard/ai-connections، /dashboard/updates) را ارجاع دهید."
      : "You are the Neeleh Academy executive admin assistant. Respond concisely in English grounded strictly in the live academy metrics below, citing exact /dashboard/* routes when actionable.";

  const prompt = `${liveFacts}\n\n${historyLines ? `CONVERSATION HISTORY:\n${historyLines}\n\n` : ""}CURRENT ADMIN MESSAGE:\n${message}`;

  const result = await executeSectionAI({
    sectionKey: "assistant",
    prompt,
    systemInstruction,
    lang,
    actorId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        code: result.code,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    message: result.text,
    tool: `${result.provider} · ${result.model} (${result.latencyMs}ms)`,
  });
}
