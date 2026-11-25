/* راستی‌آزمایی رویدادهای موس صحنه — سریع و بدون وابستگی به fps:
   norm باید بلافاصله با حرکت موس روی تیتر/متن به‌روز شود و با خروج از main صفر شود.
   usage: node scripts/mouse-verify.mjs [url] */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.context().addCookies([{ name: "neeleh_skin", value: "tresmares", url }]);
await page.goto(url, { waitUntil: "load", timeout: 45000 });
await page.waitForFunction(() => !!window.__tmScene, { timeout: 30000 });
await page.waitForTimeout(1500);

const read = () =>
  page.evaluate(() => ({
    norm: window.__tmScene.norm(),
    eased: window.__tmScene.mouse(),
    over: window.__tmScene.over(),
  }));

const report = [];
const step = async (label, x, y) => {
  await page.mouse.move(x, y, { steps: 4 });
  await page.waitForTimeout(120);
  const st = await read();
  report.push({ label, x, y, ...st });
  console.log(label.padEnd(28), `(${x},${y})`.padEnd(12), `norm=[${st.norm.map((v) => v.toFixed(3))}]`, `over=${st.over}`);
};

// ترتیب — از پایین وسط به تیتر (وسط صفحه)، راست، هدر (خروج از main)، برگشت
await step("bottom-center (over canvas)", 800, 850);
await step("over TITLE right", 1300, 450);
await step("over aside text", 1200, 700);
await step("over HEADER", 800, 30);
await step("back to canvas", 800, 800);

const t = report.find((r) => r.label === "over TITLE right");
const okTitle = t && Math.abs(t.norm[0]) > 0.4;
const h = report.find((r) => r.label === "over HEADER");
const okHeader = h && !h.over;
console.log(
  (okTitle ? "✅ موس روی تیتر صحنه را می‌راند (مثل مرجع)" : "❌ موس روی تیتر بی‌اثر") +
    " | " +
    (okHeader ? "✅ هدر → reset مثل مرجع" : "❌ هدر reset نمی‌شود"),
);

await browser.close();
