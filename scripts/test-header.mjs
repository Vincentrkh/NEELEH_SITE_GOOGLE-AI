import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 842 } });
const page = await ctx.newPage();
await page.context().addCookies([{ name: "neeleh_skin", value: "tresmares", url: "http://localhost:3000" }]);
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForFunction(() => !!window.__tmScene, { timeout: 30000 });
await page.waitForTimeout(4000);
// move to a ridge-driving spot first
await page.mouse.move(1400, 400, { steps: 6 });
await page.waitForTimeout(400);
console.log("at(1400,400):", await page.evaluate(() => ({ over: window.__tmScene.over(), norm: window.__tmScene.norm() })));
// now move onto the header (y<66)
await page.mouse.move(1646, 40, { steps: 6 });
await page.waitForTimeout(400);
console.log("at(1646,40):", await page.evaluate(() => ({ over: window.__tmScene.over(), norm: window.__tmScene.norm() })));
await page.mouse.move(1646, 56, { steps: 3 });
await page.waitForTimeout(300);
console.log("at(1646,56):", await page.evaluate(() => ({ over: window.__tmScene.over(), norm: window.__tmScene.norm() })));
// back down to content
await page.mouse.move(1646, 200, { steps: 4 });
await page.waitForTimeout(300);
console.log("at(1646,200):", await page.evaluate(() => ({ over: window.__tmScene.over(), norm: window.__tmScene.norm() })));
// what element is at 1646,40 / 56?
for (const [x,y] of [[1646,40],[1646,56],[1646,80]]) {
  const el = await page.evaluate(([x,y]) => {
    const e = document.elementFromPoint(x, y);
    return e ? e.className || e.tagName : "none";
  }, [x,y]);
  console.log(`elementFromPoint(${x},${y}):`, el);
}
await browser.close();
