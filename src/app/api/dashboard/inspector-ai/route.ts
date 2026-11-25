import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiMsg } from "@/lib/i18n";
import { DEFAULT_GEMINI_MODEL, isGeminiConfigured } from "@/lib/ai/gateway";
import { sanitizeCssProp, sanitizeCssValue, sanitizeCustomDeclarations } from "@/lib/live-overrides";

type InspectorAiRequest = {
  prompt?: string;
  pathname?: string;
  lang?: "fa" | "en";
  element?: {
    selector?: string;
    tagName?: string;
    text?: string;
    classes?: string;
    computedStyles?: Record<string, string>;
    isHeroScene?: boolean;
  };
  globeSettings?: Record<string, string | number | boolean> | null;
};

type ParsedAiResponse = {
  explanation?: string;
  shouldUpdateText?: boolean;
  text?: string;
  hidden?: boolean;
  styles?: { property?: string; value?: string }[];
  customCss?: string;
  globePatch?: { key?: string; value?: string }[];
};

const GLOBE_PATCH_KEYS = new Set([
  "texts", "showModel", "rm", "sp", "rk", "sr", "ss", "al", "ps", "dp", "pm", "sat", "ac",
  "gl", "fl", "df", "gr", "vg", "sk", "ml", "sz", "spx", "spy", "spz", "gpr", "gcm",
  "gc1", "gc2", "ga", "gp", "gk", "gsp", "gsh", "gin", "ghd", "ghr", "gfr",
  "fs", "ms", "tpx", "tpy", "tpz", "mpx", "mpy", "mpz",
  "bm", "b1", "b2", "ba", "fd", "fh", "fm", "fc",
  "ob", "os", "olg", "obl", "oc1", "oc2", "bp", "au", "ai",
]);

export async function POST(req: NextRequest) {
  const user = await requirePermission("theme.manage");
  if (!user) {
    return NextResponse.json(
      { error: await apiMsg("دسترسی مجاز نیست", "Not authorized") },
      { status: 403 },
    );
  }

  let body: InspectorAiRequest;
  try {
    body = (await req.json()) as InspectorAiRequest;
  } catch {
    return NextResponse.json(
      { error: await apiMsg("بدنه درخواست نامعتبر است", "Invalid request body") },
      { status: 400 },
    );
  }

  const prompt = (body.prompt ?? "").trim();
  const lang = body.lang === "en" ? "en" : "fa";
  if (prompt.length < 2 || prompt.length > 2000) {
    return NextResponse.json(
      { error: lang === "fa" ? "لطفاً دستور تغییرات را وارد کنید." : "Please enter an edit instruction." },
      { status: 400 },
    );
  }

  const startedAt = Date.now();
  if (!isGeminiConfigured()) {
    await db.aIUsageLedger
      .create({
        data: {
          actorId: user.id,
          feature: "live_inspector_ai",
          provider: "gemini",
          model: DEFAULT_GEMINI_MODEL,
          status: "CONFIG_REQUIRED",
          latencyMs: Date.now() - startedAt,
          errorCode: "GEMINI_API_KEY_MISSING",
        },
      })
      .catch(() => {});

    return NextResponse.json(
      {
        error:
          lang === "fa"
            ? "کلید API هوش مصنوعی روی سرور تنظیم نشده است. می‌توانید تغییرات ظاهری و متنی را از تب تنظیمات آبجکت اعمال کنید."
            : "AI API key is not configured on the server yet. You can still use the manual style & text controls.",
      },
      { status: 503 },
    );
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const el = body.element ?? {};
    const contextPayload = {
      pathname: body.pathname ?? "/",
      lang,
      selector: el.selector ?? "",
      tagName: el.tagName ?? "",
      currentText: (el.text ?? "").slice(0, 600),
      classes: (el.classes ?? "").slice(0, 240),
      computedStyles: el.computedStyles ?? {},
      isHeroScene: Boolean(el.isHeroScene),
      ...(el.isHeroScene && body.globeSettings
        ? {
            currentHeroGlobeSettings: {
              texts: body.globeSettings.texts,
              sz: body.globeSettings.sz,
              spx: body.globeSettings.spx,
              spy: body.globeSettings.spy,
              spz: body.globeSettings.spz,
              gc1: body.globeSettings.gc1,
              gc2: body.globeSettings.gc2,
              ga: body.globeSettings.ga,
              ghd: body.globeSettings.ghd,
              ac: body.globeSettings.ac,
              bm: body.globeSettings.bm,
              b1: body.globeSettings.b1,
              b2: body.globeSettings.b2,
              fs: body.globeSettings.fs,
              ms: body.globeSettings.ms,
            },
          }
        : {}),
    };

    const systemInstruction = `You are a senior architectural UI & CSS design assistant embedded inside the live site visual inspector of Neeleh Academy (آکادمی معماری نیله).
Given a selected DOM element's current properties and an admin's natural-language design/content request, return a crisp structured JSON patch.
Rules:
1. Only set shouldUpdateText=true and provide "text" if the user explicitly asked to change, rewrite, translate, shorten, or replace the wording/text. Keep CSS-only edits with shouldUpdateText=false.
2. Put CSS style changes in "styles" as kebab-case property/value pairs (e.g. position, top, right, bottom, left, z-index, width, height, min-width, max-width, min-height, box-sizing, display, color, background-color, font-size, font-weight, padding, margin, border-radius, border, box-shadow, opacity, letter-spacing, line-height, text-align, backdrop-filter, transform).
3. Use valid CSS units (px, rem, %, vw, vh, deg, #hex, rgba()). Never return dangerous URLs or script injections.
4. Only return "globePatch" items if isHeroScene is true AND the admin asked to modify the 3D Hero particle sphere, glass material, lighting, particles, 3D text/model scale/offset, or Hero background gradient. Allowed numeric/boolean/string globe keys: sz (1.5..9), spx (-9..9), spy (-6..6), spz (-6..8), ga (0..1), gp (0.8..6), gk (0..1.5), gsp (0..2.5), gsh (8..160), gin (0..2), ghd (0..2), ghr (0..360), gfr (0..1), gc1 (#hex), gc2 (#hex), gcm ("true"/"false"), ac (#hex), ps (0.3..3), fs (0.3..2.5), ms (0.3..2.5), tpx/tpy/mpx/mpy (-4..4), bm ("0"|"1"|"2"), b1 (#hex), b2 (#hex), ba (0..360), fd (0..1), fh (5..100), ob (0..1), os (8..60), oc1 (#hex), oc2 (#hex), texts.
5. Write "explanation" concisely in ${lang === "fa" ? "Persian (فارسی)" : "English"} summarizing what will change.`;

    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: `SELECTED ELEMENT CONTEXT:\n${JSON.stringify(contextPayload, null, 2)}\n\nADMIN INSTRUCTION:\n${prompt}`,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: {
              type: Type.STRING,
              description: "Concise summary of the changes in the requested UI language.",
            },
            shouldUpdateText: {
              type: Type.BOOLEAN,
              description: "True only when the element text content itself should be updated.",
            },
            text: {
              type: Type.STRING,
              description: "Replacement plain text if shouldUpdateText is true.",
            },
            hidden: {
              type: Type.BOOLEAN,
              description: "True only if the admin requested hiding the element.",
            },
            styles: {
              type: Type.ARRAY,
              description: "List of CSS property and value updates.",
              items: {
                type: Type.OBJECT,
                properties: {
                  property: { type: Type.STRING },
                  value: { type: Type.STRING },
                },
              },
            },
            customCss: {
              type: Type.STRING,
              description: "Optional extra CSS declarations.",
            },
            globePatch: {
              type: Type.ARRAY,
              description: "Optional Hero 3D sphere settings updates when isHeroScene is true.",
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  value: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const rawJson = (response.text ?? "{}").trim();
    const parsed = JSON.parse(rawJson) as ParsedAiResponse;

    const styles: Record<string, string> = {};
    if (Array.isArray(parsed.styles)) {
      for (const entry of parsed.styles) {
        const prop = entry?.property ? sanitizeCssProp(entry.property) : null;
        const val = entry?.value ? sanitizeCssValue(entry.value) : null;
        if (prop && val) styles[prop] = val;
      }
    }

    const globePatch: Record<string, string | number | boolean> = {};
    if (el.isHeroScene && Array.isArray(parsed.globePatch)) {
      for (const gp of parsed.globePatch) {
        const k = gp?.key?.trim();
        if (!k || !GLOBE_PATCH_KEYS.has(k)) continue;
        const v = String(gp.value ?? "").trim();
        if (["showModel", "sk", "ml", "gcm", "fm", "au"].includes(k)) {
          globePatch[k] = v === "true" || v === "1";
        } else if (["texts", "ac", "gc1", "gc2", "b1", "b2", "fc", "oc1", "oc2"].includes(k)) {
          globePatch[k] = v;
        } else {
          const num = Number(v);
          if (Number.isFinite(num)) globePatch[k] = num;
        }
      }
    }

    const latencyMs = Date.now() - startedAt;
    await db.aIUsageLedger
      .create({
        data: {
          actorId: user.id,
          feature: "live_inspector_ai",
          provider: "gemini",
          model: DEFAULT_GEMINI_MODEL,
          status: "SUCCESS",
          latencyMs,
        },
      })
      .catch(() => {});

    return NextResponse.json({
      ok: true,
      explanation:
        parsed.explanation?.trim() ||
        (lang === "fa" ? "تغییرات پیشنهادی آماده پیش‌نمایش است." : "Suggested changes are ready to preview."),
      ...(parsed.shouldUpdateText && typeof parsed.text === "string" ? { text: parsed.text } : {}),
      ...(parsed.hidden === true ? { hidden: true } : {}),
      styles,
      ...(typeof parsed.customCss === "string" && parsed.customCss.trim()
        ? { customCss: sanitizeCustomDeclarations(parsed.customCss) }
        : {}),
      ...(Object.keys(globePatch).length > 0 ? { globePatch } : {}),
      model: DEFAULT_GEMINI_MODEL,
      latencyMs,
    });
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const msg = err instanceof Error ? err.message : "Upstream AI error";
    await db.aIUsageLedger
      .create({
        data: {
          actorId: user.id,
          feature: "live_inspector_ai",
          provider: "gemini",
          model: DEFAULT_GEMINI_MODEL,
          status: "ERROR",
          latencyMs,
          errorCode: msg.slice(0, 120),
        },
      })
      .catch(() => {});

    console.error("[inspector-ai]", msg);
    return NextResponse.json(
      {
        error:
          lang === "fa"
            ? "خطا در ارتباط با سرویس هوش مصنوعی. لطفاً دوباره تلاش کنید."
            : "AI service temporarily unavailable. Please try again.",
      },
      { status: 502 },
    );
  }
}
