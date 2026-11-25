/* اندازه‌گیری پارالاکس سایت خودمان با همان روش ویدئوی مرجع
   — پرش مستقیم به حالت همگرا با __tmScene.jump() (رندر نرم‌افزاری کند است)
   usage: node scripts/measure-ours.mjs */
import { chromium } from "playwright";
import fs from "node:fs";

const out = "/tmp/vid/ours";
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const url = "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 842 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.context().addCookies([{ name: "neeleh_skin", value: "tresmares", url }]);
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForFunction(() => !!window.__tmScene, { timeout: 30000 });
await page.waitForTimeout(4500); // veil

/* نقاط کلیدی (نسخهٔ سریع‌تر — ۱۲ نقطه) */
const pts = [
  [978, 431], [613, 298], [1788, 459], [1756, 76], [829, 85],
  [194, 106], [120, 515], [140, 774], [508, 791], [1376, 758],
  [1812, 743], [1646, 56], [890, 382], [698, 358],
];

let idx = 0;
for (const [x, y] of pts) {
  const nx = (x / 1920) * 2 - 1;
  const ny = -(y / 842) * 2 + 1;
  /* مکان‌نما را هم واقعاً حرکت می‌دهیم (برای blow) و هم eased را به حالت همگرا می‌بریم */
  await page.mouse.move(x, y, { steps: 4 });
  await page.evaluate(([jx, jy]) => window.__tmScene.jump(jx, jy), [nx, ny]);
  await page.waitForTimeout(600); // چند فریم رندر
  await page.screenshot({
    path: `${out}/o_${String(idx++).padStart(3, "0")}.jpg`,
    type: "jpeg", quality: 88,
    clip: { x: 0, y: 100, width: 1920, height: 400 },
    timeout: 20000,
  });
}
await browser.close();
console.log("done", idx, "shots");
