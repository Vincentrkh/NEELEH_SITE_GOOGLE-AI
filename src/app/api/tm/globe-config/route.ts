import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/**
 * /api/tm/globe-config — پیکربندی صحنه «Particle Sphere» در بخش Hero پوسته Tres Mares.
 *
 * GET  (عمومی)  → { settings }
 * POST (ادمین)  → ذخیره یا بازنشانی تنظیمات از /dashboard/globe (مجوز theme.manage).
 *
 * ذخیره‌سازی: مدل Setting با key = "neeleh_particle_sphere_config" (JSON).
 */

const KEY = "neeleh_particle_sphere_config";
const DEFAULT_KEY = "neeleh_particle_sphere_default";
const LEGACY_KEY = "neeleh_bim_globe_config";

export const FACTORY_SETTINGS: Record<string, string | number | boolean> = {
  texts: "CAD\nBIM\nAI",
  showModel: true,
  modelDataUri: "",

  // Return path & physics
  rm: 1,
  sp: 1.5,
  rk: 5.5,

  // Splash & particles
  sr: 1.55,
  ss: 5.2,
  al: 0,
  ps: 0.75,
  dp: 0.25,
  pm: 1,
  sat: 1,
  ac: "#4c8694",

  // VFX
  gl: 0,
  fl: 0.85,
  df: 1,
  gr: 0.08,
  vg: 0,
  sk: true,
  ml: true,

  // Sphere geometry & position (x, y, z)
  sz: 5,
  spx: 0,
  spy: -3.8,
  spz: 0,

  // Glass material presets & HDRI reflections
  gpr: 2,
  gcm: true,
  gc1: "#ff9d7d",
  gc2: "#ffd6dc",
  ga: 0.05,
  gp: 3.4,
  gk: 0.55,
  gsp: 0,
  gsh: 40,
  gin: 1,
  ghd: 0.44,
  ghr: 25,
  gfr: 0,

  // Text & Model transforms (relative to sphere center)
  fs: 1.26,
  ms: 1,
  tpx: 0,
  tpy: 1.7,
  tpz: 0,
  mpx: 0,
  mpy: 2.75,
  mpz: 0,

  // Background & bottom fade
  bm: 2,
  b1: "#c99673",
  b2: "#ffffff",
  ba: 165,
  fd: 1,
  fh: 43,
  fm: false,
  fc: "#ffffff",

  // Interactive background orbs & parallax
  ob: 0.39,
  os: 44,
  olg: 3.4,
  obl: 0,
  oc1: "#ffffff",
  oc2: "#ffae00",
  bp: 1,

  // Playback
  au: true,
  ai: 6,
};

const NUM_KEYS = new Set([
  "rm", "sp", "rk",
  "sr", "ss", "al", "ps", "dp", "pm", "sat",
  "gl", "fl", "df", "gr", "vg",
  "sz", "spx", "spy", "spz",
  "gpr", "ga", "gp", "gk", "gsp", "gsh", "gin", "ghd", "ghr", "gfr",
  "fs", "ms", "tpx", "tpy", "tpz", "mpx", "mpy", "mpz",
  "bm", "ba", "fd", "fh",
  "ob", "os", "olg", "obl", "bp",
  "ai",
]);

const STR_KEYS = new Set([
  "texts", "modelDataUri", "ac", "gc1", "gc2", "b1", "b2", "fc", "oc1", "oc2",
]);

const BOOL_KEYS = new Set([
  "showModel", "sk", "ml", "gcm", "fm", "au",
]);

const MAX_JSON_BYTES = 2 * 1024 * 1024;

type StoredPayload = {
  settings: Record<string, string | number | boolean>;
};

function factoryPayload(): StoredPayload {
  return {
    settings: { ...FACTORY_SETTINGS },
  };
}

function normalizeStoredSettings(
  raw: Record<string, unknown>
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = { ...FACTORY_SETTINGS };

  // Legacy migration from older schema (gx/gy/gz/gc/grc/gm/gtp/gfp)
  if ("gx" in raw && !("spx" in raw) && Number.isFinite(Number(raw.gx))) {
    out.spx = Number(raw.gx);
  }
  if ("gy" in raw && !("spy" in raw) && Number.isFinite(Number(raw.gy))) {
    out.spy = Number(raw.gy);
  }
  if ("gz" in raw && !("spz" in raw) && Number.isFinite(Number(raw.gz))) {
    out.spz = Number(raw.gz);
  }
  if ("gc" in raw && !("gc1" in raw) && typeof raw.gc === "string") {
    out.gc1 = raw.gc;
  }
  if ("grc" in raw && !("gc2" in raw) && typeof raw.grc === "string") {
    out.gc2 = raw.grc;
  }
  if ("gfp" in raw && !("gp" in raw) && Number.isFinite(Number(raw.gfp))) {
    out.gp = Number(raw.gfp);
  }

  for (const [k, v] of Object.entries(raw)) {
    if (NUM_KEYS.has(k) && Number.isFinite(Number(v))) {
      out[k] = Number(v);
    } else if (STR_KEYS.has(k) && typeof v === "string") {
      out[k] = v;
    } else if (BOOL_KEYS.has(k)) {
      out[k] = v === true || v === 1 || v === "1";
    }
  }
  return out;
}

async function readStoredByKey(key: string): Promise<StoredPayload | null> {
  try {
    const row = await db.setting.findUnique({ where: { key } });
    if (!row) return null;
    const parsed = JSON.parse(row.value) as StoredPayload;
    if (!parsed || typeof parsed !== "object" || !parsed.settings) return null;
    return {
      settings: normalizeStoredSettings(parsed.settings as Record<string, unknown>),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const stored = await readStoredByKey(KEY);
  if (stored) return NextResponse.json(stored);
  const customDefault = await readStoredByKey(DEFAULT_KEY);
  return NextResponse.json(customDefault ?? factoryPayload());
}

export async function POST(req: NextRequest) {
  const user = await requirePermission("theme.manage");
  if (!user) {
    return NextResponse.json(
      { error: await apiMsg("دسترسی مجاز نیست", "Not authorized") },
      { status: 403 }
    );
  }

  let body: { reset?: boolean; makeDefault?: boolean; settings?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: await apiMsg("بدنه نامعتبر است", "Invalid request body") },
      { status: 400 }
    );
  }

  if (body.reset === true) {
    await db.setting.deleteMany({ where: { key: { in: [KEY, LEGACY_KEY] } } });
    const customDefault = await readStoredByKey(DEFAULT_KEY);
    return NextResponse.json({ ok: true, reset: true, hasCustomDefault: Boolean(customDefault) });
  }

  const rawSettings = body.settings;
  if (!rawSettings || typeof rawSettings !== "object" || Array.isArray(rawSettings)) {
    return NextResponse.json(
      { error: await apiMsg("settings نامعتبر است", "Invalid settings") },
      { status: 400 }
    );
  }

  const settings: Record<string, string | number | boolean> = { ...FACTORY_SETTINGS };
  for (const [k, v] of Object.entries(rawSettings as Record<string, unknown>)) {
    if (NUM_KEYS.has(k)) {
      const n = Number(v);
      if (!Number.isFinite(n)) {
        return NextResponse.json(
          { error: await apiMsg(`مقدار عددی نامعتبر: ${k}`, `Invalid numeric value: ${k}`) },
          { status: 400 }
        );
      }
      settings[k] = n;
    } else if (STR_KEYS.has(k)) {
      if (typeof v !== "string") {
        return NextResponse.json(
          { error: await apiMsg(`مقدار متنی نامعتبر: ${k}`, `Invalid string value: ${k}`) },
          { status: 400 }
        );
      }
      if (k === "modelDataUri") {
        if (v.length > 1_900_000) {
          return NextResponse.json(
            { error: await apiMsg("فایل مدل خیلی بزرگ است (حداکثر ~1.4MB)", "Model file is too large (max ~1.4MB)") },
            { status: 400 }
          );
        }
        const isValidDataUri =
          !v ||
          v.startsWith("data:model/") ||
          v.startsWith("data:application/octet-stream") ||
          /^data:[^;]*;base64,/i.test(v);
        if (!isValidDataUri) {
          return NextResponse.json(
            { error: await apiMsg("مدل باید dataURI معتبر GLB/GLTF باشد", "Model must be a valid GLB/GLTF dataURI") },
            { status: 400 }
          );
        }
        settings[k] = v;
      } else if (k === "texts") {
        if (v.length > 2000) {
          return NextResponse.json(
            { error: await apiMsg("متن‌ها بیش از حد طولانی هستند", "Texts exceed maximum length") },
            { status: 400 }
          );
        }
        settings[k] = v;
      } else if (v.length > 200) {
        return NextResponse.json(
          { error: await apiMsg(`مقدار خیلی طولانی: ${k}`, `Value too long: ${k}`) },
          { status: 400 }
        );
      } else {
        settings[k] = v;
      }
    } else if (BOOL_KEYS.has(k)) {
      settings[k] = Boolean(v);
    }
  }

  const value = JSON.stringify({ settings });
  if (Buffer.byteLength(value, "utf8") > MAX_JSON_BYTES) {
    return NextResponse.json(
      { error: await apiMsg("حجم کانفیگ بیش از حد مجاز است", "Config size exceeds the allowed limit") },
      { status: 400 }
    );
  }

  await db.setting.deleteMany({ where: { key: LEGACY_KEY } });
  await db.setting.upsert({
    where: { key: KEY },
    update: { value, type: "json", label: "تنظیمات کره ذرات هرو (Tres Mares)" },
    create: { key: KEY, value, type: "json", label: "تنظیمات کره ذرات هرو (Tres Mares)" },
  });

  if (body.makeDefault === true) {
    await db.setting.upsert({
      where: { key: DEFAULT_KEY },
      update: { value, type: "json", label: "پیش‌فرض سفارشی کره ذرات هرو (Tres Mares)" },
      create: { key: DEFAULT_KEY, value, type: "json", label: "پیش‌فرض سفارشی کره ذرات هرو (Tres Mares)" },
    });
  }

  return NextResponse.json({ ok: true, madeDefault: body.makeDefault === true });
}
