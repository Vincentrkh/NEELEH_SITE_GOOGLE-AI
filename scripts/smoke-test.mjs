#!/usr/bin/env node
/**
 * تست دود (Smoke Test) — آکادمی نیله
 * ─────────────────────────────────────────────────────────────────────────────
 * «چشم دوم» بعد از هر تغییر: اگر منو، دوره، بلاگ، صفحه استاتیک یا گارد امنیتی
 * خراب شده باشد، این اسکریپت قبل از هر چیز دیگری آن را می‌گیرد.
 *
 * پوشش تست‌ها:
 *   ۱) صفحات اصلی (خانه، ورود، دوره‌ها، بلاگ، ثبت‌نام) — بدون ۵xx و با محتوای واقعی
 *   ۲) همه hrefهای منو از دیتابیس (header + footer) — لینک شکسته = شکست
 *   ۳) همه دوره‌های منتشرشده / نوشته‌های PUBLISHED / صفحات استاتیک PUBLISHED
 *   ۴) گاردهای امنیتی بدون کوکی: داشبورد و APIها نباید ۲۰۰ یا ۵xx بدهند
 *   ۵) قفل نصب‌کننده: فایل .installed موجود و /install ریدایرکت شود
 *
 * اجرا:   node scripts/smoke-test.mjs
 * تنظیم:  BASE_URL=https://example.com node scripts/smoke-test.mjs
 * خروجی:  کد ۰ = همه سبز، کد ۱ = حداقل یک شکست (برای CI/هوک گیت)
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const ROOT = process.cwd();
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT || 15000);

let passed = 0;
let failed = 0;
const failures = [];

function ok(label) {
  passed++;
  console.log(`  ✅ ${label}`);
}
function bad(label, detail = "") {
  failed++;
  failures.push({ label, detail });
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
}
function skip(label, why) {
  console.log(`  ⏭️  ${label} — ${why}`);
}

/** GET با دنبال‌کردن ریدایرکت‌ها و سقف زمانی. */
async function fetchFollow(url, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      ...init,
      headers: { "user-agent": "neeleh-smoke/1.0", ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

async function expectPage(url, label, { minBytes = 2000, marker = null } = {}) {
  try {
    const res = await fetchFollow(BASE + url);
    if (res.status >= 500) return bad(label, `HTTP ${res.status} (خطای سرور)`);
    if (res.status !== 200) return bad(label, `HTTP ${res.status} (انتظار ۲۰۰)`);
    const body = await res.text();
    if (body.length < minBytes) return bad(label, `صفحه ${body.length} بایت — احتمالاً خالی`);
    if (marker && !body.includes(marker)) return bad(label, `نشانه «${marker}» در صفحه نیست`);
    return ok(`${label} [200, ${(body.length / 1024).toFixed(0)}KB]`);
  } catch (e) {
    return bad(label, e.message);
  }
}

/** گارد امنیتی: بدون کوکی نباید ۲۰۰ (محتوای محافظت‌شده) یا ۵xx بدهد. */
async function expectGuardedPage(url, label) {
  try {
    const res = await fetchFollow(BASE + url);
    if (res.status >= 500) return bad(label, `HTTP ${res.status} (خطای سرور به‌جای گارد)`);
    if (res.status === 200) {
      // ۲۰۰ فقط وقتی قابل‌قبول است که خروجی صفحه ورود باشد (ریدایرکت به login)
      const body = await res.text();
      if (body.includes("login") || body.includes("ورود")) return ok(`${label} → ریدایرکت به ورود`);
      return bad(label, "بدون احراز هویت ۲۰۰ برگرداند — سوراخ گارد!");
    }
    if ([401, 403].includes(res.status)) return ok(`${label} [${res.status}]`);
    return bad(label, `HTTP غیرمنتظره ${res.status}`);
  } catch (e) {
    return bad(label, e.message);
  }
}

/** API گاردشده: باید 401/403 بدهد — نه ۲۰۰ (سوراخ) و نه ۵xx (کرش). */
async function expectGuardedApi(url, label, method = "GET") {
  try {
    const res = await fetchFollow(BASE + url, {
      method,
      headers: { "content-type": "application/json" },
      body: method === "POST" ? JSON.stringify({}) : undefined,
    });
    if (res.status >= 500) return bad(label, `HTTP ${res.status} (کرش به‌جای گارد)`);
    if (res.status === 200) return bad(label, "بدون احراز هویت ۲۰۰ برگرداند — سوراخ امنیتی!");
    if ([401, 403].includes(res.status)) return ok(`${label} [${res.status}]`);
    // ۳xx نهایی بعد از follow معمولاً یعنی ریدایرکت به login — قابل قبول
    if (res.status >= 300 && res.status < 400) return ok(`${label} [${res.status} → ریدایرکت]`);
    return bad(label, `HTTP غیرمنتظره ${res.status}`);
  } catch (e) {
    return bad(label, e.message);
  }
}

// ── دیتابیس (بدون وابستگی به tsx): خواندن .env و import پویا ────────────────
async function loadDb() {
  const envPath = path.join(ROOT, ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  }
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  return db;
}

// ── اجرا ────────────────────────────────────────────────────────────────────
console.log(`\n🧪 تست دود آکادمی نیله — ${BASE}\n${"─".repeat(64)}`);

// ۱) صفحات اصلی
console.log("\n▶ صفحات اصلی");
await expectPage("/", "خانه", { marker: "Neeleh", minBytes: 10000 });
await expectPage("/login", "ورود", { minBytes: 1000 });
await expectPage("/courses", "فهرست دوره‌ها", { minBytes: 1000 });
await expectPage("/blog", "بلاگ", { minBytes: 1000 });
// توجه: ثبت‌نام در نیله per-course است (/register/[slug]) — در بخش دیتابیس تست می‌شود

// ۲) دیتابیس: منو، دوره، بلاگ، صفحات استاتیک
let db = null;
try {
  db = await loadDb();

  console.log("\n▶ لینک‌های منو (از دیتابیس)");
  const items = await db.menuItem.findMany({ where: { isActive: true }, orderBy: [{ location: "asc" }, { order: "asc" }] });
  if (items.length === 0) skip("منوها", "هیچ آیتم فعالی در دیتابیس نیست");
  const seen = new Set();
  for (const it of items) {
    const href = (it.href || "").trim();
    const label = `${it.location}: «${it.labelEn || it.labelFa}» → ${href}`;
    if (!href) { bad(label, "href خالی"); continue; }
    if (seen.has(href)) { ok(`${label} (تکراری — قبلاً تست شد)`); continue; }
    seen.add(href);
    if (/^(#|tel:|mailto:|javascript:)/i.test(href)) { ok(`${label} (لنگر/تماس — نیازی به تست ندارد)`); continue; }
    try {
      const url = href.startsWith("http") ? href : BASE + href;
      const res = await fetchFollow(url, { method: "GET" });
      if (res.status >= 500) bad(label, `HTTP ${res.status}`);
      else if (res.status === 404) bad(label, "لینک شکسته (404)");
      else if (res.status >= 300 && res.status < 400) ok(`${label} [${res.status}]`);
      else if (res.status === 200) ok(label);
      else bad(label, `HTTP ${res.status}`);
    } catch (e) {
      bad(label, e.message);
    }
  }

  console.log("\n▶ دوره‌های منتشرشده");
  const courses = await db.course.findMany({ where: { published: true }, select: { slug: true, title: true } });
  if (courses.length === 0) skip("دوره‌ها", "دوره‌ای منتشر نشده");
  for (const c of courses) await expectPage(`/courses/${c.slug}`, `دوره: ${c.title}`, { minBytes: 1000 });

  console.log("\n▶ صفحات ثبت‌نام دوره‌ها");
  for (const c of courses) await expectPage(`/register/${c.slug}`, `ثبت‌نام: ${c.title}`, { minBytes: 1000 });

  console.log("\n▶ نوشته‌های بلاگ (PUBLISHED)");
  const posts = await db.post.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, title: true } });
  if (posts.length === 0) skip("بلاگ", "نوشته منتشرشده‌ای نیست");
  for (const p of posts) await expectPage(`/blog/${p.slug}`, `نوشته: ${p.title}`, { minBytes: 1000 });

  console.log("\n▶ صفحات استاتیک (PUBLISHED)");
  const pages = await db.staticPage.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, title: true } });
  if (pages.length === 0) skip("صفحات استاتیک", "صفحه منتشرشده‌ای نیست");
  for (const pg of pages) await expectPage(`/page/${pg.slug}`, `صفحه: ${pg.title}`, { minBytes: 500 });
} catch (e) {
  bad("اتصال به دیتابیس", e.message);
} finally {
  if (db) await db.$disconnect();
}

// ۳) گاردهای امنیتی (بدون کوکی)
console.log("\n▶ گاردهای امنیتی");
await expectGuardedPage("/dashboard", "داشبورد مدیریت");
await expectGuardedPage("/dashboard/menus", "صفحه مدیریت منو");
await expectGuardedPage("/panel", "پنل هنرجو");
await expectGuardedApi("/api/dashboard/menus", "API منوها (GET)");
await expectGuardedApi("/api/dashboard/menus", "API منوها (POST)", "POST");
await expectGuardedApi("/api/dashboard/courses", "API دوره‌ها (GET)");
await expectGuardedApi("/api/dashboard/categories", "API دسته‌ها (GET)");
await expectGuardedApi("/api/dashboard/categories", "API دسته‌ها (POST)", "POST");
await expectGuardedApi("/api/dashboard/tags", "API برچسب‌ها (GET)");
await expectGuardedApi("/api/dashboard/posts", "API نوشته‌ها (GET)");
await expectGuardedApi("/api/dashboard/pages", "API صفحات (GET)");

// ۴) قفل نصب‌کننده
console.log("\n▶ قفل نصب‌کننده");
const markerFile = path.join(ROOT, ".installed");
if (!fs.existsSync(markerFile)) {
  bad("فایل .installed", "قفل نصب وجود ندارد — ویزارد نصب باز است! ⚠️");
} else {
  ok("فایل .installed موجود است");
  try {
    const res = await fetchFollow(BASE + "/install");
    const body = await res.text();
    if (res.status >= 500) bad("مسیر /install", `HTTP ${res.status}`);
    else if (body.includes("install") && res.status === 200 && !body.includes("ورود") && !body.includes("login")) {
      bad("مسیر /install", "با وجود قفل، ویزارد قابل دیدن است");
    } else ok(`/install در وضعیت قفل [${res.status}]`);
  } catch (e) {
    bad("مسیر /install", e.message);
  }
}

// ۵) MCP سرور — tools/list + یک فراخوانی واقعی
console.log("\n▶ MCP سرور (پروتکل اداره‌ی هوشمند)");
const mcp = spawn("node", ["--experimental-strip-types", "--no-warnings", "src/mcp/server.ts"], {
  stdio: ["pipe", "pipe", "inherit"], cwd: ROOT,
});
let mcpBuf = "";
const mcpPending = new Map();
let mcpNextId = 1;
function mcpSend(method, params = {}) {
  const id = mcpNextId++;
  mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((resolve, reject) => {
    mcpPending.set(id, { resolve, reject });
    setTimeout(() => { if (mcpPending.has(id)) { mcpPending.delete(id); reject(new Error(`MCP timeout: ${method}`)); } }, 15000);
  });
}
mcp.stdout.on("data", (chunk) => {
  mcpBuf += chunk.toString();
  let nl;
  while ((nl = mcpBuf.indexOf("\n")) >= 0) {
    const line = mcpBuf.slice(0, nl); mcpBuf = mcpBuf.slice(nl + 1);
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && mcpPending.has(msg.id)) { mcpPending.get(msg.id).resolve(msg); mcpPending.delete(msg.id); }
    } catch {}
  }
});

try {
  const init = await mcpSend("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "smoke", version: "1" } });
  if (init.result?.serverInfo?.name !== "neeleh-cms") bad("MCP initialize", "serverInfo اشتباه");
  else ok("MCP initialize");
  mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  const list = await mcpSend("tools/list", {});
  const toolCount = list.result?.tools?.length || 0;
  if (toolCount < 25) bad("MCP tools/list", `فقط ${toolCount} ابزار`);
  else ok(`MCP tools/list (${toolCount} ابزار)`);

  const health = await mcpSend("tools/call", { name: "health_check", arguments: {} });
  const healthText = health.result?.content?.[0]?.text || "";
  if (!/published_posts/.test(healthText)) bad("MCP health_check", "پاسخ نامعتبر");
  else ok("MCP health_check پاسخ معتبر برگرداند");
} catch (e) {
  bad("MCP سرور", e.message);
} finally {
  mcp.kill();
}

// ── جمع‌بندی ────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(64)}`);
console.log(`نتیجه: ${passed} ✅  |  ${failed} ❌\n`);
if (failed > 0) {
  console.log("شکست‌ها:");
  for (const f of failures) console.log(`  • ${f.label}${f.detail ? ` — ${f.detail}` : ""}`);
  console.log("");
}
process.exit(failed > 0 ? 1 : 0);
