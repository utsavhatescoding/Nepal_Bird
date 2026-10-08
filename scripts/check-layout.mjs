import { chromium } from "@playwright/test";
import { createServer } from "vite";
const server = await createServer({
  root: new URL("../", import.meta.url).pathname,
  server: { host: "127.0.0.1", port: 5173 },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto("http://127.0.0.1:5173");
await page.locator(".hero").waitFor();
await page.screenshot({ path: "/tmp/bird-desktop.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "/tmp/bird-mobile.png", fullPage: true });
for (const route of ["home", "identify", "explore", "notebook", "about"]) {
  await page.goto(`http://127.0.0.1:5173/#${route}`);
  await page.locator("main h1").waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  console.log(JSON.stringify({ route, mobileOverflow: overflow }));
  if (overflow) throw new Error(`Overflow on ${route}`);
}
await page.goto("http://127.0.0.1:5173/#explore");
await page.locator("#search").fill("monal");
console.log("Search results:", await page.locator(".catalog-card").count());
await page.locator(".catalog-card").first().click();
await page.locator("#profile-save").click();
await page.locator("[name=location]").fill("Kathmandu park");
await page
  .locator("[name=note]")
  .fill("Possible sighting. Need to check field marks.");
await page
  .getByRole("button", { name: "Save field note", exact: true })
  .click();
await page.goto("http://127.0.0.1:5173/#notebook");
await page.locator(".notebook-item").waitFor();
console.log("Notebook saved:", await page.locator(".notebook-item").count());
console.log({ errors });
await browser.close();
await server.close();
if (errors.length) throw new Error(errors.join("\n"));
