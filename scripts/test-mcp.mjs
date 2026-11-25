#!/usr/bin/env node
/**
 * تست کامل MCP سرور — چرخه عمر کامل: ساخت دسته/برچسب/نوشته، خواندن،
 * ویرایش، حذف، و پاکسازی — همه از طریق همان پروتکل MCP.
 *
 * اجرا:  node scripts/test-mcp.mjs
 * خروجی:  کد ۰ = موفق، کد ۱ = شکست
 */
import { spawn } from "node:child_process";

let pass = 0, fail = 0;
function check(label, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`); }
}

const child = spawn("node", ["--experimental-strip-types", "--no-warnings", "src/mcp/server.ts"], {
  stdio: ["pipe", "pipe", "inherit"],
  cwd: process.cwd(),
});

let buf = "";
const pending = new Map();
let nextId = 1;
function send(method, params = {}) {
  const id = nextId++;
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout: ${method}`)); } }, 15000);
  });
}
child.stdout.on("data", (chunk) => {
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
  return { ok: !r.result?.isError, text };
}

console.log(`\n🔌 تست MCP سرور آکادمی نیله\n${"─".repeat(60)}`);

// ۱) initialize
const init = await send("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "neeleh-test", version: "1.0" } });
check("initialize موفق", init.result?.serverInfo?.name === "neeleh-cms");
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

// ۲) tools/list
const list = await send("tools/list", {});
const tools = list.result?.tools || [];
check("حداقل ۲۵ ابزار موجود", tools.length >= 25, `فقط ${tools.length} ابزار`);
check("ابزار create_post موجود", tools.some((t) => t.name === "create_post"));
check("ابزار health_check موجود", tools.some((t) => t.name === "health_check"));
check("ابزار delete_post موجود", tools.some((t) => t.name === "delete_post"));
check("ابزار list_leads موجود", tools.some((t) => t.name === "list_leads"));
check("ابزارهای منو موجود", tools.some((t) => t.name === "list_menu_items") && tools.some((t) => t.name === "create_menu_item"));
check("ابزارهای تم موجود", tools.some((t) => t.name === "get_theme") && tools.some((t) => t.name === "update_theme"));
check("ابزارهای تنظیمات موجود", tools.some((t) => t.name === "get_settings") && tools.some((t) => t.name === "update_setting"));
check("ابزارهای delete دسته/برچسب/صفحه", tools.some((t) => t.name === "delete_category") && tools.some((t) => t.name === "delete_page"));

// ۳) health_check باید داده واقعی برگرداند
const health = await call("health_check");
check("health_check عدد برمی‌گرداند", /published_posts/.test(health.text), health.text.slice(0, 100));

// ۴) چرخه عمر کامل یک نوشته آزمایشی
console.log("\n▶ چرخه عمر کامل (ساخت → خواندن → ویرایش → حذف)");
const cat = await call("create_category", { name: "دسته آزمایشی MCP", slug: "mcp-test-cat-temp" });
check("ساخت دسته", cat.ok && /ساخته شد/.test(cat.text), cat.text);

const tag = await call("create_tag", { name: "mcp-temp-tag", slug: "mcp-temp-tag" });
check("ساخت برچسب", tag.ok, tag.text);

const create = await call("create_post", {
  title: "نوشته آزمایشی MCP",
  slug: "mcp-temp-post",
  excerpt: "برای تست چرخه عمر MCP.",
  content: "# تیتر\n\nمتن آزمایشی.\n\n- یک\n- دو",
  status: "DRAFT",
  categorySlugs: ["mcp-test-cat-temp"],
  tagSlugs: ["mcp-temp-tag"],
});
check("ساخت نوشته", create.ok && /mcp-temp-post/.test(create.text), create.text);

const get = await call("get_post", { slug: "mcp-temp-post" });
check("خواندن نوشته", get.ok && /نوشته آزمایشی MCP/.test(get.text));

const upd = await call("update_post", { slug: "mcp-temp-post", title: "نوشته آزمایشی MCP — ویرایش شده", status: "PUBLISHED" });
check("ویرایش نوشته", upd.ok && /به‌روز شد/.test(upd.text), upd.text);

const pub = await call("get_post", { slug: "mcp-temp-post" });
check("انتشار خودکار publishedAt", pub.ok && /publishedAt/.test(pub.text) && !/"publishedAt": null/.test(pub.text));

const del = await call("delete_post", { slug: "mcp-temp-post" });
check("حذف نوشته", del.ok && /حذف شد/.test(del.text), del.text);

const verify = await call("get_post", { slug: "mcp-temp-post" });
check("نوشته واقعاً حذف شده", /پیدا نشد/.test(verify.text), verify.text);

// پاکسازی دسته و برچسب آزمایشی (PrismaClient بعداً در بخش تنظیمات import می‌شود)
const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();
await db.category.deleteMany({ where: { slug: "mcp-test-cat-temp" } });
await db.tag.deleteMany({ where: { slug: "mcp-temp-tag" } });
await db.$disconnect();

// ۵) ابزارهای عملیاتی
console.log("\n▶ ابزارهای عملیاتی");
const leads = await call("list_leads", { limit: 5 });
check("list_leads پاسخ می‌دهد", leads.ok && /count/.test(leads.text));

const regs = await call("list_registrations", { limit: 5 });
check("list_registrations پاسخ می‌دهد", regs.ok && /count/.test(regs.text));

const courses = await call("list_courses", {});
check("list_courses پاسخ می‌دهد", courses.ok && /count/.test(courses.text));

// ۶) چرخه عمر منو
console.log("\n▶ چرخه عمر منو");
const menusBefore = await call("list_menu_items", { location: "footer" });
const beforeCount = JSON.parse(menusBefore.text).count;
check("list_menu_items پاسخ می‌دهد", menusBefore.ok && /byLocation/.test(menusBefore.text));

const newMenu = await call("create_menu_item", {
  location: "footer",
  labelFa: "آزمایش MCP",
  labelEn: "MCP Test",
  href: "/page/faq",
  bgColor: "#cbcccd",
  isActive: false,
});
check("ساخت آیتم منو", newMenu.ok && /ساخته شد/.test(newMenu.text), newMenu.text);

const menusAfter = await call("list_menu_items", { location: "footer" });
const afterCount = JSON.parse(menusAfter.text).count;
check("آیتم منو واقعاً اضافه شده", afterCount === beforeCount + 1, `${beforeCount} → ${afterCount}`);

// پیدا کردن آیتم تازه و حذفش
const newItems = JSON.parse(menusAfter.text).items.filter((i) => i.labelEn === "MCP Test");
if (newItems.length === 1) {
  const delMenu = await call("delete_menu_item", { id: newItems[0].id });
  check("حذف آیتم منو", delMenu.ok && /حذف شد/.test(delMenu.text), delMenu.text);
} else {
  check("حذف آیتم منو", false, "آیتم تازه پیدا نشد");
}

// ۷) چرخه عمر تم (غیرمخرب — فقط خواندن و به‌روزرسانی یک فیلد امن)
console.log("\n▶ چرخه عمر تم");
const themeBefore = await call("get_theme");
check("get_theme پاسخ می‌دهد", themeBefore.ok && /accentColor/.test(themeBefore.text), themeBefore.text.slice(0, 100));

const themeUpd = await call("update_theme", { radius: "0.85rem" });
check("update_theme به‌روز می‌کند", themeUpd.ok && /به‌روز شد/.test(themeUpd.text), themeUpd.text);

const themeAfter = await call("get_theme");
check("تم واقعاً تغییر کرده", /0\.85rem/.test(themeAfter.text));

// برگشت به حالت قبل
await call("update_theme", { radius: "0.75rem" });

// ۸) چرخه عمر تنظیمات
console.log("\n▶ چرخه عمر تنظیمات");
const setUpdate = await call("update_setting", { key: "mcp_test_key", value: "test_value_123", type: "text", label: "آزمایش MCP" });
check("update_setting ذخیره می‌کند", setUpdate.ok && /ذخیره شد/.test(setUpdate.text), setUpdate.text);

const setGet = await call("get_setting", { key: "mcp_test_key" });
check("get_setting مقدار را برمی‌گرداند", setGet.ok && /test_value_123/.test(setGet.text), setGet.text);

const settingsList = await call("get_settings");
check("get_settings فهرست می‌دهد", settingsList.ok && /mcp_test_key/.test(settingsList.text));

// پاکسازی تنظیمات آزمایشی
await db.setting.deleteMany({ where: { key: "mcp_test_key" } });
await db.$disconnect();

// ── جمع‌بندی ────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}\nنتیجه: ${pass} ✅  |  ${fail} ❌\n`);
child.kill();
process.exit(fail > 0 ? 1 : 0);
