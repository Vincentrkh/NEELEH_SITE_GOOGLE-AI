#!/usr/bin/env node
/**
 * تست انتها-به-انتهای دستیار وب: لاگین، ارسال پیام، دریافت جواب، تأیید کار کرد
 */
import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const ROOT = process.cwd();

// .env
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}
const PHONE = process.env.ADMIN_PHONE;
const PASSWORD = process.env.ADMIN_PASSWORD;

let pass = 0, fail = 0;
function check(label, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`); }
}

console.log(`\n🧪 تست دستیار وب — ${BASE}\n${"─".repeat(60)}`);

// ۱) لاگین — مستقیم به مسیر با trailingSlash چون Next تنظیم شده با trailingSlash:true
const loginRes = await fetch(`${BASE}/api/auth/login/`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ phone: PHONE, password: PASSWORD }),
  redirect: "manual",
});
const setCookies = loginRes.headers.getSetCookie?.() || [];
const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
const loginOk = loginRes.status === 200 || (loginRes.status >= 300 && loginRes.status < 400);
check("لاگین موفق", loginOk, `status=${loginRes.status}, body=${await loginRes.text().catch(() => "")}`.slice(0, 200));
check("کوکی نشست دریافت شد", !!cookie, `setCookies=${setCookies.length}`);

const headers = { "content-type": "application/json", cookie };

// ۲) تست ۱: پرسش ساده — وضعیت سایت
console.log("\n▶ تست ۱: «وضعیت سایت چطور است؟»");
const r1 = await fetch(`${BASE}/api/dashboard/assistant`, {
  method: "POST",
  headers,
  body: JSON.stringify({ message: "وضعیت سایت چطور است؟", history: [] }),
});
check("API پاسخ می‌دهد", r1.ok, `status=${r1.status}`);
const j1 = await r1.json();
check("action برمی‌گرداند", !!j1.action, JSON.stringify(j1).slice(0, 200));
check("یا done است یا call_tool", ["done", "call_tool", "ask_user"].includes(j1.action), `action=${j1.action}`);
if (j1.action === "call_tool") {
  check("ابزار انتخاب شده", !!j1.tool, `tool=${j1.tool}`);
  check("نتیجه ابزار برگشته", !!j1.result, `result.length=${j1.result?.length || 0}`);
  console.log(`     💭 ${j1.thought?.slice(0, 100) || ""}`);
  console.log(`     🔧 ${j1.tool} → ${(j1.result || "").slice(0, 100)}...`);
} else if (j1.action === "done") {
  console.log(`     💬 ${(j1.message || "").slice(0, 200)}`);
}

// ۳) تست ۲: درخواست محتوای فارسی — نوشته کوتاه
console.log("\n▶ تست ۲: «یک پاراگراف کوتاه درباره BIM به من بده»");
const r2 = await fetch(`${BASE}/api/dashboard/assistant`, {
  method: "POST",
  headers,
  body: JSON.stringify({ message: "یک پاراگراف کوتاه درباره BIM به من بده (بدون ساختن نوشته)", history: [] }),
});
const j2 = await r2.json();
check("پاسخ دریافت شد", r2.ok);
check("دستیار پاسخ متنی می‌دهد", !!j2.message || !!j2.thought, JSON.stringify(j2).slice(0, 200));
if (j2.message) {
  console.log(`     💬 ${j2.message.slice(0, 200)}...`);
  check("متن فارسی است", /[\u0600-\u06FF]/.test(j2.message), "no persian chars");
}

// ۴) تست ۳: دستور اجرایی — نشان دادن منوی فوتر
console.log("\n▶ تست ۳: «منوی فوتر را نشان بده»");
const r3 = await fetch(`${BASE}/api/dashboard/assistant`, {
  method: "POST",
  headers,
  body: JSON.stringify({ message: "منوی فوتر را نشان بده", history: [] }),
});
const j3 = await r3.json();
check("دستیار ابزار منو را صدا می‌زند", j3.action === "call_tool" && /menu/.test(j3.tool || ""), `action=${j3.action}, tool=${j3.tool}`);
if (j3.action === "call_tool") {
  check("نتیجه شامل آیتم‌های منو است", /footer|فوتر/i.test(j3.result || ""), (j3.result || "").slice(0, 150));
}

console.log(`\n${"─".repeat(60)}\nنتیجه: ${pass} ✅  |  ${fail} ❌\n`);
process.exit(fail > 0 ? 1 : 0);
