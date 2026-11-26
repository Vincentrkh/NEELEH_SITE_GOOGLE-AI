import { GoogleGenAI, ThinkingLevel, type Schema } from "@google/genai";
import { db } from "@/lib/db";
import {
  decryptSecret,
  maskSecret,
  validateExternalHttpsUrl,
} from "@/lib/crypto-vault";
import { sanitizeRetrievedContext } from "@/lib/domain/academy-rules";

export const DEFAULT_SECTIONS: Array<{
  sectionKey: string;
  labelFa: string;
  labelEn: string;
  descriptionFa: string;
  descriptionEn: string;
  requireConsent: boolean;
  defaultSystemPrompt: string;
}> = [
  {
    sectionKey: "assistant",
    labelFa: "دستیار هوشمند مدیریت",
    labelEn: "Admin Smart Assistant",
    descriptionFa: "پاسخگویی هوشمند و تحلیل داده‌های دوره‌ها، ثبت‌نام‌ها و عملیات پنل مدیریت.",
    descriptionEn: "Operational assistant for courses, registrations, and admin workflows.",
    requireConsent: false,
    defaultSystemPrompt:
      "You are the executive operations assistant for Neeleh Architecture Academy (آکادمی معماری نیله). Give accurate, concise, actionable guidance grounded in the academy metrics provided.",
  },
  {
    sectionKey: "course_guide",
    labelFa: "راهنمای هوشمند انتخاب دوره",
    labelEn: "Public Course Path Guide",
    descriptionFa: "مشاور هوشمند بازدیدکنندگان برای پیشنهاد مسیر آموزشی متناسب با پیش‌زمینه.",
    descriptionEn: "Visitor-facing advisor recommending tracks strictly from the published catalog.",
    requireConsent: true,
    defaultSystemPrompt:
      "You are the official course advisor for Neeleh Architecture Academy. Ground every recommendation strictly in the provided course catalog facts.",
  },
  {
    sectionKey: "live_inspector",
    labelFa: "بازرس صحنه زنده (Live Inspector)",
    labelEn: "Live Visual Scene Inspector",
    descriptionFa: "تبدیل دستورات متنی ادمین به تغییرات CSS و تنظیمات سه‌بعدی در لحظه.",
    descriptionEn: "Converts natural-language styling instructions into safe CSS and 3D scene patches.",
    requireConsent: false,
    defaultSystemPrompt:
      "You are a senior UI and architectural visualization design assistant for Neeleh Academy.",
  },
  {
    sectionKey: "exam_generator",
    labelFa: "دستیار طراحی آزمون‌های پایان دوره",
    labelEn: "Course Final Exam Designer",
    descriptionFa: "تولید خودکار سوالات استاندارد چهارگزینه‌ای دوزبانه بر اساس سرفصل‌های هر دوره.",
    descriptionEn: "Drafts bilingual multiple-choice assessment questions aligned with course syllabi.",
    requireConsent: false,
    defaultSystemPrompt:
      "You are an architectural engineering educator designing practical multiple-choice exam questions for Neeleh Academy.",
  },
  {
    sectionKey: "content_writer",
    labelFa: "دستیار نگارش مقالات و سئو",
    labelEn: "Editorial & SEO Assistant",
    descriptionFa: "کمک به نگارش، خلاصه‌سازی و بومی‌سازی متون آموزشی و مقالات بلاگ.",
    descriptionEn: "Assists editors with drafting, summarizing, and translating course & blog copy.",
    requireConsent: false,
    defaultSystemPrompt:
      "You are a bilingual architectural editor writing crisp, technical prose in Persian and English.",
  },
];

export async function ensureAiDefaults() {
  let geminiConn = await db.aIProviderConnection.findUnique({
    where: { key: "gemini-server" },
  });
  const envConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
  if (!geminiConn) {
    geminiConn = await db.aIProviderConnection.create({
      data: {
        key: "gemini-server",
        name: "درگاه رسمی Gemini (سرور)",
        nameEn: "Google Gemini (Server Managed)",
        providerType: "GEMINI_ENV",
        defaultModel: "gemini-4-hydrogen",
        enabled: true,
        lastStatus: envConfigured ? "OK" : "UNTESTED",
      },
    });
  }

  for (const sec of DEFAULT_SECTIONS) {
    await db.aISectionBinding.upsert({
      where: { sectionKey: sec.sectionKey },
      create: {
        sectionKey: sec.sectionKey,
        labelFa: sec.labelFa,
        labelEn: sec.labelEn,
        descriptionFa: sec.descriptionFa,
        descriptionEn: sec.descriptionEn,
        providerId: geminiConn.id,
        enabled: true,
        requireConsent: sec.requireConsent,
        systemPrompt: sec.defaultSystemPrompt,
      },
      update: {},
    });
  }

  return geminiConn;
}

export type SafeProviderView = {
  id: string;
  key: string;
  name: string;
  nameEn: string | null;
  providerType: string;
  baseUrl: string | null;
  defaultModel: string;
  hasKey: boolean;
  keyHint: string | null;
  enabled: boolean;
  lastTestedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
};

export async function listAiProvidersAndSections(): Promise<{
  providers: SafeProviderView[];
  sections: Array<{
    id: string;
    sectionKey: string;
    labelFa: string;
    labelEn: string;
    descriptionFa: string;
    descriptionEn: string;
    providerId: string | null;
    modelOverride: string | null;
    systemPrompt: string | null;
    enabled: boolean;
    requireConsent: boolean;
  }>;
}> {
  await ensureAiDefaults();
  const [providers, sections] = await Promise.all([
    db.aIProviderConnection.findMany({ orderBy: { createdAt: "asc" } }),
    db.aISectionBinding.findMany({ orderBy: { sectionKey: "asc" } }),
  ]);

  const envReady = Boolean(process.env.GEMINI_API_KEY?.trim());

  return {
    providers: providers.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      nameEn: p.nameEn,
      providerType: p.providerType,
      baseUrl: p.baseUrl,
      defaultModel: p.defaultModel,
      hasKey: p.providerType === "GEMINI_ENV" ? envReady : Boolean(p.encryptedKey),
      keyHint:
        p.providerType === "GEMINI_ENV"
          ? envReady
            ? "ENV ••••"
            : null
          : p.keyHint,
      enabled: p.enabled,
      lastTestedAt: p.lastTestedAt ? p.lastTestedAt.toISOString() : null,
      lastStatus: p.lastStatus,
      lastError: p.lastError,
    })),
    sections: sections.map((s) => ({
      id: s.id,
      sectionKey: s.sectionKey,
      labelFa: s.labelFa,
      labelEn: s.labelEn,
      descriptionFa: s.descriptionFa,
      descriptionEn: s.descriptionEn,
      providerId: s.providerId,
      modelOverride: s.modelOverride,
      systemPrompt: s.systemPrompt,
      enabled: s.enabled,
      requireConsent: s.requireConsent,
    })),
  };
}

export async function executeSectionAI(params: {
  sectionKey: string;
  prompt: string;
  systemInstruction?: string;
  lang: "fa" | "en";
  actorId?: string | null;
  responseMimeType?: "application/json" | "text/plain";
  responseSchema?: Schema;
}): Promise<
  | { ok: true; text: string; provider: string; model: string; latencyMs: number }
  | {
      ok: false;
      code: "DISABLED" | "CONFIG_REQUIRED" | "INVALID_INPUT" | "UPSTREAM_ERROR";
      error: string;
      status: number;
    }
> {
  await ensureAiDefaults();
  const cleanPrompt = sanitizeRetrievedContext(params.prompt);
  if (!cleanPrompt || cleanPrompt.length < 2) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      error: params.lang === "fa" ? "متن درخواست کوتاه یا نامعتبر است." : "Prompt is too short.",
      status: 400,
    };
  }

  const binding = await db.aISectionBinding.findUnique({
    where: { sectionKey: params.sectionKey },
    include: { provider: true },
  });

  if (binding && !binding.enabled) {
    return {
      ok: false,
      code: "DISABLED",
      error:
        params.lang === "fa"
          ? "اتصال هوش مصنوعی برای این بخش از تنظیمات غیرفعال شده است."
          : "AI connection for this section is currently disabled by administrator.",
      status: 403,
    };
  }

  const provider =
    binding?.provider ??
    (await db.aIProviderConnection.findUnique({ where: { key: "gemini-server" } }));

  if (!provider || !provider.enabled) {
    return {
      ok: false,
      code: "CONFIG_REQUIRED",
      error:
        params.lang === "fa"
          ? "سرویس‌دهنده هوش مصنوعی فعال نیست."
          : "No active AI provider is configured for this section.",
      status: 503,
    };
  }

  const model = (binding?.modelOverride?.trim() || provider.defaultModel || "gemini-4-hydrogen").trim();
  const finalSystem = [binding?.systemPrompt?.trim(), params.systemInstruction?.trim()]
    .filter(Boolean)
    .join("\n\n");

  const startedAt = Date.now();

  // Route 1: Server-managed Gemini SDK
  if (provider.providerType === "GEMINI_ENV") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey.length < 10) {
      await db.aIUsageLedger
        .create({
          data: {
            actorId: params.actorId ?? null,
            feature: params.sectionKey,
            provider: provider.key,
            model,
            status: "CONFIG_REQUIRED",
            latencyMs: Date.now() - startedAt,
            errorCode: "GEMINI_API_KEY_MISSING",
          },
        })
        .catch(() => {});
      return {
        ok: false,
        code: "CONFIG_REQUIRED",
        error:
          params.lang === "fa"
            ? "کلید سرور Gemini تنظیم نشده است. می‌توانید یک سرویس‌دهنده دیگر (مانند OpenAI-Compatible یا Ollama) را در بخش «اتصال هوش مصنوعی» متصل کنید."
            : "Server Gemini key is not set. You can bind an OpenAI-compatible or local Ollama provider in AI Connections.",
        status: 503,
      };
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { "User-Agent": "aistudio-build" },
        },
      });
      const response = await ai.models.generateContent({
        model,
        contents: cleanPrompt,
        config: {
          ...(finalSystem ? { systemInstruction: finalSystem } : {}),
          ...(model.startsWith("gemini-4") || model.startsWith("gemini-3")
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
          ...(params.responseMimeType ? { responseMimeType: params.responseMimeType } : {}),
          ...(params.responseSchema ? { responseSchema: params.responseSchema } : {}),
        },
      });
      const text = (response.text ?? "").trim();
      const latencyMs = Date.now() - startedAt;

      await db.aIUsageLedger
        .create({
          data: {
            actorId: params.actorId ?? null,
            feature: params.sectionKey,
            provider: provider.key,
            model,
            status: "SUCCESS",
            latencyMs,
          },
        })
        .catch(() => {});

      return { ok: true, text, provider: provider.key, model, latencyMs };
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      const msg = err instanceof Error ? err.message : "Gemini error";
      await db.aIUsageLedger
        .create({
          data: {
            actorId: params.actorId ?? null,
            feature: params.sectionKey,
            provider: provider.key,
            model,
            status: "ERROR",
            latencyMs,
            errorCode: msg.slice(0, 120),
          },
        })
        .catch(() => {});
      return {
        ok: false,
        code: "UPSTREAM_ERROR",
        error:
          params.lang === "fa"
            ? "خطا در ارتباط با سرویس هوش مصنوعی. لطفاً تنظیمات اتصال را بررسی کنید."
            : "Upstream AI request failed.",
        status: 502,
      };
    }
  }

  // Route 2: OpenAI-Compatible / Local Ollama / Custom HTTPS REST endpoint
  const allowOllama = provider.providerType === "OLLAMA_LOCAL";
  const targetBase =
    provider.baseUrl?.trim() ||
    (allowOllama ? "http://127.0.0.1:11434/v1" : "https://api.openai.com/v1");
  const urlCheck = validateExternalHttpsUrl(targetBase, { allowOllamaLoopback: allowOllama });
  if (!urlCheck.ok) {
    return {
      ok: false,
      code: "CONFIG_REQUIRED",
      error: urlCheck.error,
      status: 400,
    };
  }

  const secret = decryptSecret(provider.encryptedKey);
  if (!secret && !allowOllama) {
    return {
      ok: false,
      code: "CONFIG_REQUIRED",
      error:
        params.lang === "fa"
          ? "کلید API این سرویس‌دهنده تنظیم نشده است."
          : "API key is missing for this provider.",
      status: 503,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const endpoint = urlCheck.normalized.endsWith("/chat/completions")
      ? urlCheck.normalized
      : `${urlCheck.normalized}/chat/completions`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (secret) {
      headers.Authorization = `Bearer ${secret}`;
    }

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (finalSystem) {
      messages.push({ role: "system", content: finalSystem });
    }
    messages.push({ role: "user", content: cleanPrompt });

    const payload: Record<string, unknown> = {
      model,
      messages,
    };
    if (params.responseMimeType === "application/json") {
      payload.response_format = { type: "json_object" };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      await db.aIUsageLedger
        .create({
          data: {
            actorId: params.actorId ?? null,
            feature: params.sectionKey,
            provider: provider.key,
            model,
            status: "ERROR",
            latencyMs,
            errorCode: `HTTP_${res.status}`,
          },
        })
        .catch(() => {});
      return {
        ok: false,
        code: "UPSTREAM_ERROR",
        error:
          params.lang === "fa"
            ? `پاسخ ناموفق از سرویس‌دهنده (${res.status}): ${errBody.slice(0, 120)}`
            : `Upstream provider returned HTTP ${res.status}`,
        status: 502,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      message?: { content?: string };
      output_text?: string;
    };
    const text = (
      data.choices?.[0]?.message?.content ??
      data.message?.content ??
      data.output_text ??
      ""
    ).trim();

    await db.aIUsageLedger
      .create({
        data: {
          actorId: params.actorId ?? null,
          feature: params.sectionKey,
          provider: provider.key,
          model,
          status: "SUCCESS",
          latencyMs,
        },
      })
      .catch(() => {});

    return { ok: true, text, provider: provider.key, model, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const msg = err instanceof Error ? err.message : "Network error";
    await db.aIUsageLedger
      .create({
        data: {
          actorId: params.actorId ?? null,
          feature: params.sectionKey,
          provider: provider.key,
          model,
          status: "ERROR",
          latencyMs,
          errorCode: msg.slice(0, 120),
        },
      })
      .catch(() => {});
    return {
      ok: false,
      code: "UPSTREAM_ERROR",
      error:
        params.lang === "fa"
          ? "ارتباط با سرویس‌دهنده هوش مصنوعی برقرار نشد."
          : "Could not connect to AI provider.",
      status: 502,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function testAiProviderById(
  providerId: string,
  lang: "fa" | "en",
  actorId: string,
) {
  const provider = await db.aIProviderConnection.findUnique({ where: { id: providerId } });
  if (!provider) {
    return { ok: false, error: lang === "fa" ? "سرویس‌دهنده یافت نشد" : "Provider not found", latencyMs: 0 };
  }

  const startedAt = Date.now();

  // Temporarily execute a minimal ping using the provider directly
  if (provider.providerType === "GEMINI_ENV") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      await db.aIProviderConnection.update({
        where: { id: provider.id },
        data: {
          lastTestedAt: new Date(),
          lastStatus: "ERROR",
          lastError: "GEMINI_API_KEY missing",
        },
      });
      return {
        ok: false,
        error: lang === "fa" ? "کلید سرور GEMINI_API_KEY تنظیم نشده است." : "Server GEMINI_API_KEY is missing.",
        latencyMs: Date.now() - startedAt,
      };
    }
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });
      const res = await ai.models.generateContent({
        model: provider.defaultModel || "gemini-4-hydrogen",
        contents: "Reply with OK",
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
      });
      const latencyMs = Date.now() - startedAt;
      const ok = Boolean((res.text ?? "").trim());
      await db.aIProviderConnection.update({
        where: { id: provider.id },
        data: {
          lastTestedAt: new Date(),
          lastStatus: ok ? "OK" : "ERROR",
          lastError: ok ? null : "Empty response",
        },
      });
      await db.aIUsageLedger
        .create({
          data: {
            actorId,
            feature: "connection_test",
            provider: provider.key,
            model: provider.defaultModel,
            status: ok ? "SUCCESS" : "ERROR",
            latencyMs,
          },
        })
        .catch(() => {});
      return { ok, latencyMs, preview: (res.text ?? "").trim().slice(0, 60) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Test failed";
      const latencyMs = Date.now() - startedAt;
      await db.aIProviderConnection.update({
        where: { id: provider.id },
        data: {
          lastTestedAt: new Date(),
          lastStatus: "ERROR",
          lastError: msg.slice(0, 180),
        },
      });
      return { ok: false, error: msg.slice(0, 180), latencyMs };
    }
  }

  const allowOllama = provider.providerType === "OLLAMA_LOCAL";
  const targetBase =
    provider.baseUrl?.trim() || (allowOllama ? "http://127.0.0.1:11434/v1" : "https://api.openai.com/v1");
  const check = validateExternalHttpsUrl(targetBase, { allowOllamaLoopback: allowOllama });
  if (!check.ok) {
    return { ok: false, error: check.error, latencyMs: 0 };
  }
  const secret = decryptSecret(provider.encryptedKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const endpoint = check.normalized.endsWith("/chat/completions")
      ? check.normalized
      : `${check.normalized}/chat/completions`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({
        model: provider.defaultModel,
        messages: [{ role: "user", content: "Reply with OK" }],
      }),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      await db.aIProviderConnection.update({
        where: { id: provider.id },
        data: {
          lastTestedAt: new Date(),
          lastStatus: "ERROR",
          lastError: `HTTP ${res.status}: ${txt.slice(0, 120)}`,
        },
      });
      return { ok: false, error: `HTTP ${res.status}`, latencyMs };
    }
    await db.aIProviderConnection.update({
      where: { id: provider.id },
      data: { lastTestedAt: new Date(), lastStatus: "OK", lastError: null },
    });
    return { ok: true, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const msg = err instanceof Error ? err.message : "Network error";
    await db.aIProviderConnection.update({
      where: { id: provider.id },
      data: { lastTestedAt: new Date(), lastStatus: "ERROR", lastError: msg.slice(0, 180) },
    });
    return { ok: false, error: msg.slice(0, 180), latencyMs };
  } finally {
    clearTimeout(timer);
  }
}

export { maskSecret };
