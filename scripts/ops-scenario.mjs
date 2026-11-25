#!/usr/bin/env node
/**
 * سناریوی عملیاتی کامل آکادمی نیله — گردش کار واقعی از تماس تا تأیید
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * این سناریو نشان می‌دهد که چطور یک ایجنت MCP می‌تواند سایت را واقعاً اداره کند:
 *
 *   ۱) هنرجو فرم مشاوره را پر می‌کند → سرنخ (Lead) ساخته می‌شود (API عمومی)
 *   ۲) ایجنت health_check را صدا می‌زند → هشدار «سرنخ جدید» را می‌بیند (MCP)
 *   ۳) ایجنت لیست سرنخ‌ها را می‌بیند، وضعیت را به CONTACTED تغییر می‌دهد (MCP)
 *   ۴) هنرجو در یک دوره ثبت‌نام می‌کند → حساب کاربری + ثبت‌نام PENDING (API عمومی)
 *   ۵) ایجنت در health_check می‌بیند «ثبت‌نام در انتظار تأیید» (MCP)
 *   ۶) ایجنت ثبت‌نام را CONFIRMED + PAID می‌کند (MCP)
 *   ۷) ایجنت سرنخ را CONVERTED می‌کند — چون تبدیل به هنرجو شد (MCP)
 *   ۸) health_check دوباره — هیچ هشداری نباید باشد (MCP)
 *   ۹) پاکسازی داده‌های آزمایشی
 *
 * اجرا:  node scripts/ops-scenario.mjs
 */
import { spawn } from "node:child_process";

let pass = 0, fail = 0;
function check(label, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`); }
}

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const TEST_PHONE = "09120000099";  // شماره آزمایشی متمایز
const TEST_PASSWORD = "test-pass-123456";
const COURSE_SLUG = process.env.TEST_COURSE_SLUG || "autocad-phase2";

// ── MCP سرور ─────────────────────────────────────────────────────────────────
const mcp = spawn("node", ["--experimental-strip-types", "--no-warnings", "src/mcp/server.ts"], {
  stdio: ["pipe", "pipe", "inherit"], cwd: process.cwd(),
});
let buf = "";
const pending = new Map();
let nextId = 1;
function send(method, params = {}) {
  const id = nextId++;
  mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout: ${method}`)); } }, 15000);
  });
}
mcp.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id).resolve(msg); pending.delete(msg.id); }
    } catch {}
  }
});
async function call(name, args = {}) {
  const r = await send("tools/call", { name, arguments: args });
  const text = r.result?.content?.[0]?.text || "";
  return { ok: !r.result?.isError, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
}

// ── راه‌اندازی ───────────────────────────────────────────────────────────────
console.log(`\n🎭 سناریوی عملیاتی آکادمی نیله — ${BASE}\n${"─".repeat(64)}`);

await send("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "ops-scenario", version: "1.0" } });
mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

// پاکسازی پیشینی — اگر داده آزمایشی از اجرای قبلی مانده باشد
const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();
const priorUser = await db.user.findUnique({ where: { phone: TEST_PHONE } });
if (priorUser) {
  await db.registration.deleteMany({ where: { studentId: priorUser.id } });
  await db.session.deleteMany({ where: { userId: priorUser.id } });
  await db.user.delete({ where: { id: priorUser.id } });
}
await db.lead.deleteMany({ where: { phone: TEST_PHONE } });
await db.$disconnect();
console.log("🧹 داده‌های آزمایشی قبلی (اگر بود) پاک شدند\n");

// ── مرحله ۱: هنرجو فرم مشاوره را پر می‌کند ─────────────────────────────────────
console.log("▶ مرحله ۱: هنرجو فرم مشاوره را پر می‌کند (API عمومی)");
const leadRes = await fetch(BASE + "/api/leads", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "تست هنرجوی سناریو",
    phone: TEST_PHONE,
    email: "scenario-test@example.com",
    message: "سلام، برای دوره AutoCAD فاز ۲ مشاوره می‌خواستم. آیا پیش‌نیاز خاصی دارد؟",
  }),
});
const leadJson = await leadRes.json();
check("فرم مشاوره ثبت شد", leadRes.ok && leadJson.ok, JSON.stringify(leadJson));

// ── مرحله ۲: ایجنت health_check را صدا می‌زند ─────────────────────────────────
console.log("\n▶ مرحله ۲: ایجنت صبح را با health_check شروع می‌کند (MCP)");
const h1 = await call("health_check");
const h1json = h1.json;
check("health_check پاسخ می‌دهد", h1.ok && h1json?.summary);
check("سرنخ جدید در هشدارها دیده می‌شود", h1json?.alerts?.some((a) => /سرنخ جدید/.test(a)), JSON.stringify(h1json?.alerts));
check("تعداد سرنخ‌های جدید ≥ ۱", h1json?.summary?.new_leads >= 1, `new_leads=${h1json?.summary?.new_leads}`);

// ── مرحله ۳: ایجنت لیست سرنخ‌ها را می‌بیند و تماس می‌گیرد ───────────────────────
console.log("\n▶ مرحله ۳: ایجنت سرنخ‌های جدید را رسیدگی می‌کند (MCP)");
const leads = await call("list_leads", { status: "NEW", limit: 10 });
const leadsList = leads.json?.leads || [];
const ourLead = leadsList.find((l) => l.phone === TEST_PHONE);
check("سرنخ آزمایشی در لیست سرنخ‌های NEW", !!ourLead, `leads count=${leadsList.length}`);
if (ourLead) {
  console.log(`     📞 سرنخ پیدا شد: «${ourLead.name}» — ${ourLead.phone}`);
  const upd = await call("update_lead_status", {
    id: ourLead.id,
    status: "CONTACTED",
    note: "تماس گرفته شد. هنرجو علاقه‌مند به دوره AutoCAD فاز ۲ است. پیش‌نیاز خاصی ندارد. پیشنهاد شد ثبت‌نام کند.",
  });
  check("وضعیت سرنخ به CONTACTED تغییر کرد", upd.ok && /CONTACTED/.test(upd.text), upd.text);
}

// ── مرحله ۴: هنرجو در دوره ثبت‌نام می‌کند ─────────────────────────────────────
console.log("\n▶ مرحله ۴: هنرجو در دوره ثبت‌نام می‌کند (API عمومی)");
const regRes = await fetch(BASE + "/api/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    slug: COURSE_SLUG,
    name: "تست هنرجوی سناریو",
    phone: TEST_PHONE,
    password: TEST_PASSWORD,
    email: "scenario-test@example.com",
    field: "معماری",
    education: "کارشناسی معماری",
    note: "پس از تماس کارشناس، تصمیم به ثبت‌نام گرفتم.",
  }),
});
const regJson = await regRes.json();
check("ثبت‌نام در دوره انجام شد", regRes.ok && (regJson.ok || regJson.user), JSON.stringify(regJson).slice(0, 200));

// ── مرحله ۵: ایجنت دوباره health_check می‌بیند ─────────────────────────────────
console.log("\n▶ مرحله ۵: ایجنت ثبت‌نام جدید را در health_check می‌بیند (MCP)");
const h2 = await call("health_check");
const h2json = h2.json;
check("ثبت‌نام در انتظار تأیید دیده می‌شود", h2json?.summary?.pending_registrations >= 1, `pending=${h2json?.summary?.pending_registrations}`);
check("سرنخ آزمایشی دیگر در NEW نیست (CONTACTED شد)", h2json?.summary?.new_leads === 0, `new_leads=${h2json?.summary?.new_leads}`);

// ── مرحله ۶: ایجنت ثبت‌نام را تأیید می‌کند ─────────────────────────────────────
console.log("\n▶ مرحله ۶: ایجنت ثبت‌نام را تأیید و پرداخت را ثبت می‌کند (MCP)");
const regs = await call("list_registrations", { status: "PENDING", limit: 20 });
const regsList = regs.json?.registrations || [];
const ourReg = regsList.find((r) => r.studentPhone === TEST_PHONE);
check("ثبت‌نام آزمایشی در لیست PENDING", !!ourReg, `regs=${regsList.length}`);
if (ourReg) {
  console.log(`     📝 ثبت‌نام پیدا شد: «${ourReg.studentName}» در دوره «${ourReg.course}»`);
  const upd = await call("update_registration_status", {
    id: ourReg.id,
    status: "CONFIRMED",
    paymentStatus: "PAID",
    note: "پرداخت تأیید شد. کارشناس آموزش تماس گرفت و واریز را تأیید کرد.",
  });
  check("ثبت‌نام CONFIRMED و PAID شد", upd.ok && /به‌روز شد/.test(upd.text), upd.text);
}

// ── مرحله ۷: ایجنت سرنخ را CONVERTED می‌کند ────────────────────────────────────
console.log("\n▶ مرحله ۷: ایجنت سرنخ را به CONVERTED تغییر می‌دهد (MCP)");
if (ourLead) {
  const conv = await call("update_lead_status", {
    id: ourLead.id,
    status: "CONVERTED",
    note: "تبدیل به هنرجو شد. در دوره AutoCAD فاز ۲ ثبت‌نام کرد. پرداخت تأیید شد.",
  });
  check("سرنخ CONVERTED شد", conv.ok && /CONVERTED/.test(conv.text), conv.text);
}

// ── مرحله ۸: health_check نهایی — باید همه هشدارها پاک شده باشند ───────────────
console.log("\n▶ مرحله ۸: health_check نهایی — تأیید پاکسازی هشدارها (MCP)");
const h3 = await call("health_check");
const h3json = h3.json;
check("سرنخ‌های NEW صفر شد", h3json?.summary?.new_leads === 0, `new_leads=${h3json?.summary?.new_leads}`);
check("ثبت‌نام‌های PENDING صفر شد", h3json?.summary?.pending_registrations === 0, `pending=${h3json?.summary?.pending_registrations}`);
check("هیچ هشداری باقی نمانده (نسبت به داده آزمایشی)", h3json?.alerts === "هیچ هشداری نیست — همه چیز رو به راه است." || !/سرنخ جدید|در انتظار تأیید/.test(JSON.stringify(h3json?.alerts)), JSON.stringify(h3json?.alerts));

// ── مرحله ۹: پاکسازی داده‌های آزمایشی ──────────────────────────────────────────
console.log("\n▶ مرحله ۹: پاکسازی داده‌های آزمایشی");
const db2 = new PrismaClient();
const testUser = await db2.user.findUnique({ where: { phone: TEST_PHONE } });
if (testUser) {
  await db2.registration.deleteMany({ where: { studentId: testUser.id } });
  await db2.session.deleteMany({ where: { userId: testUser.id } });
  await db2.user.delete({ where: { id: testUser.id } });
}
await db2.lead.deleteMany({ where: { phone: TEST_PHONE } });
await db2.$disconnect();
check("داده‌های آزمایشی پاک شدند", true);

// ── جمع‌بندی ──────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(64)}\nنتیجه سناریو: ${pass} ✅  |  ${fail} ❌\n`);
mcp.kill();
process.exit(fail > 0 ? 1 : 0);
