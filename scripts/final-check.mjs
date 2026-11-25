/* بررسی نهایی: کنسول + اسکرین‌شات هرو + وضعیت صحنه
   usage: node scripts/final-check.mjs */
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
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on("console", (m) => {
  if (["error", "warning"].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
await page.context().addCookies([{ name: "neeleh_skin", value: "tresmares", url }]);
await page.goto(url, { waitUntil: "load", timeout: 45000 });
await page.waitForFunction(() => !!window.__tmScene, { timeout: 30000 });
await page.waitForTimeout(5000);

const st = await page.evaluate(() => ({
  canvas: !!document.querySelector(".tm-hero-scene canvas"),
  frame: window.__tmScene.frame(),
  eased: window.__tmScene.mouse(),
}));
await page.screenshot({ path: "/tmp/vid/final-hero.png" });

/* حرکت موس روی تیتر و خواندن فوری norm */
await page.mouse.move(1300, 450, { steps: 6 });
await page.waitForTimeout(300);
const st2 = await page.evaluate(() => window.__tmScene.norm());

console.log("canvas:", st.canvas, "| frames:", st.frame, "| errors:", errors.length);
errors.slice(0, 4).forEach((e) => console.log("  ", e));
console.log("norm after move over title:", st2.map((v) => v.toFixed(3)).join(", "));
await browser.close();
