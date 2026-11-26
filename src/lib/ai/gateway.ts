import { db } from "@/lib/db";
import { sanitizeRetrievedContext } from "@/lib/domain/academy-rules";
import { executeSectionAI } from "@/lib/ai/connections";

export type AiGenerateResult =
  | { ok: true; text: string; model: string; latencyMs: number }
  | {
      ok: false;
      code: "CONFIG_REQUIRED" | "INVALID_INPUT" | "UPSTREAM_ERROR";
      error: string;
      status: number;
    };

export const DEFAULT_GEMINI_MODEL = "gemini-4-hydrogen";

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key.length > 10);
}

export type IntegrationStatusItem = {
  id: string;
  nameFa: string;
  nameEn: string;
  configured: boolean;
  statusFa: string;
  statusEn: string;
  envHint: string;
};

export function getIntegrationStatuses(): IntegrationStatusItem[] {
  const geminiReady = isGeminiConfigured();
  const smtpReady = Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim());
  const smsReady = Boolean(process.env.SMS_API_KEY?.trim());
  const paymentReady = Boolean(process.env.ZARINPAL_MERCHANT_ID?.trim() || process.env.IDPAY_API_KEY?.trim());
  const chamiloReady = Boolean(process.env.CHAMILO_BASE_URL?.trim() && process.env.CHAMILO_API_KEY?.trim());

  return [
    {
      id: "gemini",
      nameFa: "درگاه هوش مصنوعی Gemini",
      nameEn: "Gemini AI Gateway",
      configured: geminiReady,
      statusFa: geminiReady ? "تنظیم شده" : "نیازمند کلید مالک (تنظیم نشده)",
      statusEn: geminiReady ? "Configured" : "Not configured (owner key required)",
      envHint: "GEMINI_API_KEY",
    },
    {
      id: "email",
      nameFa: "سرویس ارسال ایمیل (SMTP)",
      nameEn: "Email Delivery (SMTP)",
      configured: smtpReady,
      statusFa: smtpReady ? "تنظیم شده" : "تنظیم نشده",
      statusEn: smtpReady ? "Configured" : "Not configured",
      envHint: "SMTP_HOST / SMTP_USER",
    },
    {
      id: "sms",
      nameFa: "درگاه پیامک احراز هویت / یادآور",
      nameEn: "SMS OTP & Reminders",
      configured: smsReady,
      statusFa: smsReady ? "تنظیم شده" : "تنظیم نشده",
      statusEn: smsReady ? "Configured" : "Not configured",
      envHint: "SMS_API_KEY",
    },
    {
      id: "payment",
      nameFa: "درگاه پرداخت آنلاین (تومان)",
      nameEn: "Online Payment Gateway",
      configured: paymentReady,
      statusFa: paymentReady ? "تنظیم شده" : "تنظیم نشده — ثبت‌نام در حالت رزرو دستی",
      statusEn: paymentReady ? "Configured" : "Not configured — manual reservation flow",
      envHint: "ZARINPAL_MERCHANT_ID",
    },
    {
      id: "chamilo",
      nameFa: "اتصال Chamilo LMS",
      nameEn: "Chamilo LMS Sync",
      configured: chamiloReady,
      statusFa: chamiloReady ? "تنظیم شده" : "تنظیم نشده",
      statusEn: chamiloReady ? "Configured" : "Not configured",
      envHint: "CHAMILO_BASE_URL",
    },
  ];
}

export async function runCourseGuideAI(params: {
  prompt: string;
  lang: "en" | "fa";
  actorId?: string | null;
  contextFacts: string;
}): Promise<AiGenerateResult> {
  const systemInstruction =
    params.lang === "fa"
      ? `شما راهنمای رسمی دوره‌های آکادمی معماری نیله هستید. فقط بر اساس فهرست واقعی دوره‌ها و سرفصل‌های زیر پاسخ دهید. هرگز قیمت، زمان‌بندی، گواهینامه یا پیش‌نیازی را که در داده‌ها نیست اختراع نکنید. پاسخ را کوتاه، ساختاریافته و کاربردی بنویسید و لینک نسبی دوره‌ها (/courses/[slug]) را پیشنهاد دهید.`
      : `You are the official course advisor for Neeleh Architecture Academy. Ground every recommendation strictly in the provided course catalog facts below. Never invent prices, dates, certificates, or outcomes not present in the facts. Keep responses concise, structured, and cite exact /courses/[slug] paths.`;

  const res = await executeSectionAI({
    sectionKey: "course_guide",
    prompt: `CATALOG FACTS (trusted reference data):\n${sanitizeRetrievedContext(
      params.contextFacts,
    )}\n\nUSER QUESTION:\n${sanitizeRetrievedContext(params.prompt)}`,
    systemInstruction,
    lang: params.lang,
    actorId: params.actorId ?? null,
  });

  if (!res.ok) {
    return {
      ok: false,
      code: res.code === "DISABLED" ? "CONFIG_REQUIRED" : res.code,
      error: res.error,
      status: res.status,
    };
  }

  return {
    ok: true,
    text: res.text || (params.lang === "fa" ? "پاسخی دریافت نشد." : "No response returned."),
    model: res.model,
    latencyMs: res.latencyMs,
  };
}
