import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";
import {
  LIVE_OVERRIDES_SETTING_KEY,
  LiveOverrideRule,
  normalizeOverridePath,
  parseLiveOverrides,
  sanitizeCssProp,
  sanitizeCssValue,
  sanitizeCustomDeclarations,
} from "@/lib/live-overrides";

/**
 * /api/dashboard/live-overrides
 * GET  (عمومی)  → برگرداندن لیست قوانین ویرایش زنده برای اعمال در سایت
 * POST (ادمین)  → ذخیره، حذف یا بازنشانی قوانین ویرایش زنده (مجوز theme.manage)
 */

async function readRules(): Promise<LiveOverrideRule[]> {
  try {
    const row = await db.setting.findUnique({ where: { key: LIVE_OVERRIDES_SETTING_KEY } });
    return parseLiveOverrides(row?.value);
  } catch {
    return [];
  }
}

async function writeRules(rules: LiveOverrideRule[]): Promise<void> {
  const value = JSON.stringify({ rules });
  await db.setting.upsert({
    where: { key: LIVE_OVERRIDES_SETTING_KEY },
    update: {
      value,
      type: "json",
      label: "قوانین ویرایش زنده صحنه (بازرس ادمین)",
    },
    create: {
      key: LIVE_OVERRIDES_SETTING_KEY,
      value,
      type: "json",
      label: "قوانین ویرایش زنده صحنه (بازرس ادمین)",
    },
  });
  revalidateTag("live-overrides", { expire: 0 });
  revalidatePath("/", "layout");
}

export async function GET() {
  const rules = await readRules();
  return NextResponse.json({ rules });
}

type PostBody = {
  action?: "upsert" | "delete" | "clearPage" | "clearAll";
  id?: string;
  path?: string;
  rule?: {
    id?: string;
    path?: string;
    selector?: string;
    label?: string;
    text?: string | null;
    styles?: Record<string, string | null | undefined>;
    customCss?: string | null;
    hidden?: boolean;
  };
};

export async function POST(req: NextRequest) {
  const user = await requirePermission("theme.manage");
  if (!user) {
    return NextResponse.json(
      { error: await apiMsg("دسترسی مجاز نیست", "Not authorized") },
      { status: 403 },
    );
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json(
      { error: await apiMsg("بدنه درخواست نامعتبر است", "Invalid request body") },
      { status: 400 },
    );
  }

  const current = await readRules();
  const action = body.action ?? "upsert";

  if (action === "clearAll") {
    await writeRules([]);
    await db.auditLog
      .create({
        data: {
          actorId: user.id,
          action: "LIVE_OVERRIDE_CLEAR_ALL",
          entityType: "Setting",
          entityId: LIVE_OVERRIDES_SETTING_KEY,
          beforeJson: JSON.stringify({ count: current.length }),
          afterJson: JSON.stringify({ count: 0 }),
        },
      })
      .catch(() => {});
    return NextResponse.json({ ok: true, rules: [] });
  }

  if (action === "clearPage") {
    const targetPath = normalizeOverridePath(body.path ?? "/");
    const next = current.filter((r) => r.path !== targetPath);
    await writeRules(next);
    return NextResponse.json({ ok: true, rules: next });
  }

  if (action === "delete") {
    const targetId = (body.id ?? "").trim();
    if (!targetId) {
      return NextResponse.json(
        { error: await apiMsg("شناسه قانون الزامی است", "Rule ID is required") },
        { status: 400 },
      );
    }
    const next = current.filter((r) => r.id !== targetId);
    await writeRules(next);
    await db.auditLog
      .create({
        data: {
          actorId: user.id,
          action: "LIVE_OVERRIDE_DELETE",
          entityType: "Setting",
          entityId: LIVE_OVERRIDES_SETTING_KEY,
          afterJson: JSON.stringify({ id: targetId }),
        },
      })
      .catch(() => {});
    return NextResponse.json({ ok: true, rules: next });
  }

  // Upsert rule
  const rawRule = body.rule;
  const selector = rawRule?.selector?.trim() ?? "";
  if (!selector || selector.length > 500 || /[{}]/.test(selector)) {
    return NextResponse.json(
      { error: await apiMsg("سلکتور آبجکت نامعتبر است", "Invalid element selector") },
      { status: 400 },
    );
  }

  const normPath = normalizeOverridePath(rawRule?.path ?? "/");
  const styles: Record<string, string> = {};
  if (rawRule?.styles && typeof rawRule.styles === "object") {
    for (const [k, v] of Object.entries(rawRule.styles)) {
      if (v === null || v === undefined || String(v).trim() === "") continue;
      const prop = sanitizeCssProp(k);
      const val = sanitizeCssValue(String(v));
      if (prop && val) styles[prop] = val;
    }
  }

  const customCss =
    typeof rawRule?.customCss === "string" && rawRule.customCss.trim()
      ? sanitizeCustomDeclarations(rawRule.customCss)
      : undefined;
  const text = typeof rawRule?.text === "string" ? rawRule.text : undefined;
  const hidden = rawRule?.hidden === true ? true : undefined;

  const id =
    (rawRule?.id && rawRule.id.trim()) ||
    `${normPath}::${selector}`;

  const hasAnyEffect =
    text !== undefined ||
    Object.keys(styles).length > 0 ||
    Boolean(customCss) ||
    Boolean(hidden);

  let next: LiveOverrideRule[];
  if (!hasAnyEffect) {
    next = current.filter((r) => r.id !== id && !(r.path === normPath && r.selector === selector));
  } else {
    const cleanRule: LiveOverrideRule = {
      id,
      path: normPath,
      selector,
      label: (rawRule?.label?.trim() || selector).slice(0, 120),
      ...(text !== undefined ? { text } : {}),
      ...(Object.keys(styles).length > 0 ? { styles } : {}),
      ...(customCss ? { customCss } : {}),
      ...(hidden ? { hidden } : {}),
      updatedAt: new Date().toISOString(),
    };
    const existingIdx = current.findIndex(
      (r) => r.id === id || (r.path === normPath && r.selector === selector),
    );
    if (existingIdx >= 0) {
      next = [...current];
      next[existingIdx] = cleanRule;
    } else {
      next = [...current, cleanRule];
    }
  }

  await writeRules(next);
  await db.auditLog
    .create({
      data: {
        actorId: user.id,
        action: "LIVE_OVERRIDE_UPSERT",
        entityType: "Setting",
        entityId: LIVE_OVERRIDES_SETTING_KEY,
        afterJson: JSON.stringify({ id, path: normPath, selector }),
      },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true, rules: next });
}
