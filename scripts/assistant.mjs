#!/usr/bin/env node
/**
 * دستیار زبان طبیعی آکادمی نیله — یک ایجنت واقعی
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * این اسکریپت یک حلقه‌ی ایجنت است که:
 *   ۱) ابزارهای MCP را از سرور می‌خواند
 *   ۲) دستور زبانی کاربر را می‌گیرد
 *   ۳) با LLM تصمیم می‌گیرد کدام ابزار با چه آرگومان‌هایی صدا زده شود
 *   ۴) ابزار را از طریق MCP اجرا می‌کند
 *   ۵) نتیجه را به LLM می‌دهد تا خلاصه کند یا گام بعدی را تعیین کند
 *   ۶) تا تکمیل کار ادامه می‌دهد
 *
 * اجرا:
 *   node scripts/assistant.mjs "سرنخ‌های جدید را نشان بده"
 *   node scripts/assistant.mjs "یک نوشته کوتاه درباره رندرینگ V-Ray بنویس و منتشر کن"
 *   node scripts/assistant.mjs   (حالت تعاملی)
 */
import { spawn } from "node:child_process";
import ZAI from "z-ai-web-dev-sdk";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

// ── MCP سرور ─────────────────────────────────────────────────────────────────
const mcp = spawn("node", ["--experimental-strip-types", "--no-warnings", "src/mcp/server.ts"], {
  stdio: ["pipe", "pipe", "inherit"], cwd: process.cwd(),
});
let mcpBuf = "";
const mcpPending = new Map();
let mcpNextId = 1;
function mcpSend(method, params = {}) {
  const id = mcpNextId++;
  mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((resolve, reject) => {
    mcpPending.set(id, { resolve, reject });
    setTimeout(() => { if (mcpPending.has(id)) { mcpPending.delete(id); reject(new Error(`timeout: ${method}`)); } }, 20000);
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

async function callMcpTool(name, args) {
  const r = await mcpSend("tools/call", { name, arguments: args });
  const text = r.result?.content?.[0]?.text || "";
  return { ok: !r.result?.isError, text };
}

// ── راه‌اندازی MCP و LLM ────────────────────────────────────────────────────────
const init = await mcpSend("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "neeleh-assistant", version: "1.0" } });
if (init.result?.serverInfo?.name !== "neeleh-cms") {
  console.error("❌ MCP سرور راه‌اندازی نشد"); process.exit(1);
}
mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

const toolsList = await mcpSend("tools/list", {});
const tools = toolsList.result?.tools || [];

const zai = await ZAI.create();

// ── پرامپت سیستم ──────────────────────────────────────────────────────────────
const toolCatalog = tools.map((t) => {
  const schema = t.inputSchema?.properties ? Object.entries(t.inputSchema.properties)
    .map(([k, v]) => `${k}${v.description ? ` (${v.description})` : ""}`) : [];
  return `- ${t.name}: ${t.description}${schema.length ? `\n  args: ${schema.join(", ")}` : ""}`;
}).join("\n\n");

const SYSTEM_PROMPT = `تو دستیار مدیریت سایت آکادمی نیله هستی — یک آکادمی آموزش نرم‌افزارهای معماری (AutoCAD, Revit, SketchUp, Rhino, Grasshopper, ...).

کاربر با زبان طبیعی (فارسی یا انگلیسی) درخواست می‌کند و تو باید با ابزارهای موجود آن را اجرا کنی.

## ابزارهای موجود

${toolCatalog}

## قواعد

۱) در هر مرحله، فقط یک ابزار صدا بزن.

۲) پاسخ تو باید JSON معتبر باشد (بدون متن اضافی قبل یا بعد). فرمت:
\`\`\`json
{
  "thought": "توضیح کوتاه از تصمیمت (یک جمله)",
  "action": "call_tool" | "done" | "ask_user",
  "tool": "نام ابزار (اگر action=call_tool)",
  "args": { ... },
  "message": "پیام به کاربر (اگر action=ask_user یا done)"
}
\`\`\`

۳) اگر درخواست کاربر کامل شد (مثلاً نوشته ساخته شد و منتشر شد)، action="done" بزن و خلاصه‌ای کوتاه بده.

۴) اگر اطلاعات کافی نداری (مثلاً کاربر گفت «یک نوشته بنویس» ولی موضوع مشخص نکرد)، action="ask_user" بزن و بپرس.

۵) وقتی محتوای فارسی تولید می‌کنی، از Markdown ساده استفاده کن (تیتر #، ##، ###؛ لیست با - یا *؛ نقل‌قول با >). متن باید متمایز، عمیق و متناسب با موضوع آکادمی معماری باشد — نه کلیشه‌ای.

۶) برای ساخت نوشته، حتماً slug انگلیسی کوتاه و توصیفی بساز (مثلاً "vray-rendering-tips"). excerpt یک جمله‌ای و جذاب بنویس. readingMins را تخمین بزن. categorySlugs را از بین این‌ها انتخاب اگر مناسب بودند: training, industry, tools, ai. tagSlugs را از بین: rendering, vray, bim, revit, autocad, sketchup, grasshopper, parametric-design, artificial-intelligence, automation, excel, quantity-takeoff.

۷) برای انتشار یک نوشته، دو مرحله لازم است: اول create_post (با status=DRAFT یا PUBLISHED)، بعد اگر DRAFT بود، publish_post با slug.

۸) هیچ‌وقت داده آزمایشی نساز — فقط درخواست واقعی کاربر را اجرا کن.

۹) اگر ابزار خطا داد، آن را به کاربر گزارش بده و بپرس چه کار کند.`;

// ── حلقه‌ی ایجنت ────────────────────────────────────────────────────────────────
async function runAgent(userMessage, maxSteps = 10) {
  const messages = [
    { role: "assistant", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  for (let step = 1; step <= maxSteps; step++) {
    console.log(`\n${"─".repeat(60)}\n🤖 گام ${step}`);

    // دریافت تصمیم LLM
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content || "";

    // استخراج JSON (حتی اگر در code block باشد)
    let decision;
    try {
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
      const jsonStr = (jsonMatch[1] || raw).trim();
      decision = JSON.parse(jsonStr);
    } catch {
      // اگر LLM مستقیم جواب داد (نه JSON)، آن را پاسخ نهایی بگیر
      console.log(`💬 ${raw}`);
      return { ok: true, message: raw, steps: step };
    }

    if (decision.thought) console.log(`💭 ${decision.thought}`);

    if (decision.action === "done") {
      console.log(`\n✅ ${decision.message || "تمام شد."}`);
      return { ok: true, message: decision.message, steps: step };
    }

    if (decision.action === "ask_user") {
      console.log(`\n❓ ${decision.message}`);
      return { ok: true, needsInput: true, message: decision.message, steps: step };
    }

    if (decision.action === "call_tool" && decision.tool) {
      console.log(`🔧 صدا زدن: ${decision.tool}`);
      if (decision.args && Object.keys(decision.args).length > 0) {
        const preview = JSON.stringify(decision.args).slice(0, 200);
        console.log(`   args: ${preview}${JSON.stringify(decision.args).length > 200 ? "..." : ""}`);
      }

      const result = await callMcpTool(decision.tool, decision.args || {});
      console.log(`   → ${result.ok ? "✅" : "❌"} ${result.text.slice(0, 300)}${result.text.length > 300 ? "..." : ""}`);

      // نتیجه را به تاریخچه اضافه کن تا LLM گام بعدی را تصمیم بگیرد
      messages.push({ role: "assistant", content: raw });
      messages.push({
        role: "user",
        content: `نتیجه ابزار ${decision.tool}:\n${result.text}\n\nبر اساس این نتیجه، گام بعدی را تعیین کن. اگر کار تمام شد، action="done" بزن.`,
      });
      continue;
    }

    console.log(`⚠️ پاسخ نامشخص: ${JSON.stringify(decision).slice(0, 200)}`);
    return { ok: false, message: "پاسخ LLM نامشخص بود", steps: step };
  }

  console.log("⚠️ به حداکثر گام‌ها رسیدی.");
  return { ok: false, message: "حداکثر گام‌ها", steps: maxSteps };
}

// ── رابط کاربری ────────────────────────────────────────────────────────────────
console.log(`\n🧠 دستیار آکادمی نیله — ${tools.length} ابزار در دسترس\n${"═".repeat(60)}`);
console.log(`سرور: ${BASE}`);
console.log(`ابزارها: ${tools.map((t) => t.name).slice(0, 8).join(", ")}, ...`);
console.log(`\nمثال‌ها:`);
console.log(`  • "وضعیت سایت چطور است؟"`);
console.log(`  • "سرنخ‌های جدید را نشان بده"`);
console.log(`  • "یک نوشته کوتاه درباره رندرینگ V-Ray بنویس و منتشر کن"`);
console.log(`  • "منوی فوتر را نشان بده"`);
console.log(`\nبرای خروج: Ctrl+C یا "خروج"\n${"═".repeat(60)}`);

const userArg = process.argv[2];
if (userArg) {
  // حالت تک‌دستوری
  console.log(`\n👤 شما: ${userArg}`);
  await runAgent(userArg);
  mcp.kill();
  process.exit(0);
}

// حالت تعاملی
const readline = await import("node:readline/promises");
const { stdin, stdout } = process;
const rl = readline.createInterface({ input: stdin, output: stdout });

while (true) {
  const input = await rl.question("\n👤 شما: ").catch(() => null);
  if (input === null) break;
  const trimmed = input.trim();
  if (!trimmed) continue;
  if (/^(خروج|exit|quit|bye)$/i.test(trimmed)) {
    console.log("👋 خدانگهدار");
    break;
  }
  await runAgent(trimmed);
}

rl.close();
mcp.kill();
process.exit(0);
