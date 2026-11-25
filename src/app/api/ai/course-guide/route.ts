import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getApiLang } from "@/lib/i18n";
import { runCourseGuideAI } from "@/lib/ai/gateway";
import { localePrice, tierLabel } from "@/lib/format";
import { checkSlidingRateLimit, extractClientIp } from "@/lib/security";

type Body = {
  question?: string;
  consentGranted?: boolean;
};

export async function POST(req: NextRequest) {
  const lang = await getApiLang();
  const user = await getCurrentUser();
  const rlKey = user ? `u:${user.id}` : `ip:${extractClientIp(req.headers)}`;
  const rl = checkSlidingRateLimit("ai-course-guide", rlKey, 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error:
          lang === "fa"
            ? "تعداد درخواست‌های راهنمای هوشمند بیش از حد مجاز است. دقایقی بعد تلاش کنید."
            : "Too many AI advisor requests. Please wait a few minutes.",
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  try {
    const body = (await req.json()) as Body;
    const question = (body.question ?? "").trim();

    if (!body.consentGranted) {
      return NextResponse.json(
        {
          error:
            lang === "fa"
              ? "لطفاً ابتدا رضایت استفاده از راهنمای هوشمند دوره‌ها را تأیید کنید."
              : "Please confirm AI assistant consent before submitting your question.",
        },
        { status: 400 }
      );
    }

    const courses = await db.course.findMany({
      where: { published: true },
      orderBy: [{ tier: "asc" }, { sortOrder: "asc" }],
      select: {
        slug: true,
        title: true,
        titleEn: true,
        tier: true,
        description: true,
        descriptionEn: true,
        prereqs: true,
        prereqsEn: true,
        durationHrs: true,
        price: true,
        regStatus: true,
      },
    });

    const contextFacts = courses
      .map((c) => {
        const title = lang === "fa" ? c.title : c.titleEn || c.title;
        const desc = lang === "fa" ? c.description : c.descriptionEn || c.description;
        const prereq = lang === "fa" ? c.prereqs : c.prereqsEn || c.prereqs;
        const priceStr = c.price > 0 ? localePrice(lang, c.price) : lang === "fa" ? "تماس بگیرید" : "Contact us";
        return `- [${tierLabel(lang, c.tier)}] ${title} | path: /courses/${c.slug} | hours: ${c.durationHrs} | price: ${priceStr} | regStatus: ${c.regStatus} | summary: ${desc} | prereqs: ${prereq || "none"}`;
      })
      .join("\n");

    if (user) {
      await db.aIConsentRecord
        .create({
          data: {
            subjectId: user.id,
            scope: "COURSE_GUIDE",
            granted: true,
          },
        })
        .catch(() => {});
    }

    const result = await runCourseGuideAI({
      prompt: question,
      lang,
      actorId: user?.id ?? null,
      contextFacts,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, code: result.code, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      answer: result.text,
      model: result.model,
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    console.error("course-guide API error", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          lang === "fa"
            ? "خطا در پردازش درخواست راهنمای دوره"
            : "Failed to process course advisor request",
      },
      { status: 500 }
    );
  }
}
