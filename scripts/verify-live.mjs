/* تست تعامل واقعی — بدون jump: مسیر موس، ریست روی هدر، رفتار طبیعی
   usage: node scripts/verify-live.mjs */
import { chromium } from "playwright";
import fs from "node:fs";

const out = "/tmp/vid/live";
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 842 } });
const page = await ctx.newPage();
await page.context().addCookies([{ name: "neeleh_skin", value: "tresmares", url: "http://localhost:3000" }]);
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForFunction(() => !!window.__tmScene, { timeout: 30000 });
await page.waitForTimeout(4500);

let idx = 0;
const snap = async (label) => {
  await page.screenshot({ path: `${out}/l_${String(idx++).padStart(2, "0")}_${label}.jpg`, type: "jpeg", quality: 88, clip: { x: 0, y: 100, width: 1920, height: 400 }, timeout: 20000 });
  const s = await page.evaluate(() => ({ eased: window.__tmScene.mouse(), over: window.__tmScene.over(), peak: window.__tmScene.peak() }));
  console.log(label, JSON.stringify(s));
  return s;
};

/* ۱) حرکت به راست-وسط (سه ثانیه برای همگرایی طبیعی) */
await page.mouse.move(1812, 743, { steps: 25 });
await page.waitForTimeout(3000);
await snap("bottomright");

/* ۲) حرکت به چپ-بالا */
await page.mouse.move(194, 106, { steps: 25 });
await page.waitForTimeout(3000);
await snap("topleft");

/* ۳) روی هدر — باید ریست شود */
await page.mouse.move(1200, 40, { steps: 10 });
await page.waitForTimeout(1200);
await snap("onheader");

/* ۴) برگشت به مرکز */
await page.mouse.move(978, 431, { steps: 12 });
await page.waitForTimeout(2500);
await snap("center");

/* ۵) ساکن روی کوه — blow باید ابرهای نزدیک را محو کند */
await page.mouse.move(890, 382, { steps: 10 });
await page.waitForTimeout(350);
await snap("blow_t0");
await page.waitForTimeout(1200);
await snap("blow_t1");

await browser.close();
console.log("done", idx);
