/* نسخه دیباگ سریع: ۳ نقطه + زمان‌بندی هر مرحله */
import { chromium } from "playwright";
import fs from "node:fs";

const out = process.argv[2] || "/tmp/vid/ours";
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const url = "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 842 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.context().addCookies([{ name: "neeleh_skin", value: "tresmares", url }]);
const t0 = Date.now();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
console.log("goto", Date.now() - t0);
await page.waitForFunction(() => !!window.__tmScene, { timeout: 30000 }).catch((e) => console.log("no __tmScene", e.message));
console.log("scene", Date.now() - t0);
await page.waitForTimeout(4500);
console.log("veil", Date.now() - t0);

for (const [x, y] of [[978, 431], [1788, 459], [194, 106]]) {
  let a = Date.now();
  await page.mouse.move(x, y, { steps: 15 });
  console.log("move", Date.now() - a);
  a = Date.now();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}/o_${x}.jpg`, type: "jpeg", quality: 90, timeout: 8000 }).catch((e) => console.log("shot fail", e.message));
  console.log("shot", Date.now() - a, "at", x, y);
  a = Date.now();
  const s = await page.evaluate(() => window.__tmScene ? { eased: window.__tmScene.mouse(), peak: window.__tmScene.peak(), over: window.__tmScene.over() } : null);
  console.log("eval", Date.now() - a, JSON.stringify(s));
}
await browser.close();
console.log("done", Date.now() - t0);
