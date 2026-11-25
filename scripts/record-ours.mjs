/* ضبط ویدئوی سایت خودمان با همان مسیر موسِ ویدئوی مرجع
   usage: node scripts/record-ours.mjs */
import { chromium } from "playwright";

const url = "http://localhost:3000";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ],
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 560 },
  recordVideo: { dir: "/tmp/vid/ours", size: { width: 1280, height: 560 } },
});
const page = await ctx.newPage();
await page.context().addCookies([{ name: "neeleh_skin", value: "tresmares", url }]);
await page.goto(url, { waitUntil: "load", timeout: 45000 });
await page.waitForFunction(() => !!window.__tmScene, { timeout: 30000 });
await page.waitForTimeout(4000); // veil

/* مسیر ویدئوی مرجع (نرمال‌شده روی 1280×560) */
const path = [
  [653, 287],
  [331, 177],
  [1191, 305],
  [1170, 50],
  [80, 71],
  [93, 499],
  [1223, 494],
  [1098, 38],
  [465, 238],
];
const st = [];
for (const [x, y] of path) {
  await page.mouse.move(x, y, { steps: 12 });
  await page.waitForTimeout(6000);
  const s = await page.evaluate(() => ({
    eased: window.__tmScene.mouse(),
    peak: window.__tmScene.peak(),
  }));
  st.push({ x, y, ...s });
  console.log(`mouse(${x},${y}) eased=[${s.eased.map((v) => v.toFixed(2))}] peak=${s.peak?.map((v) => v.toFixed(1))}`);
}
await browser.close();
console.log("state:", JSON.stringify(st));
