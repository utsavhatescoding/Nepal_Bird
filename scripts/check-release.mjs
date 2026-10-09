import { chromium } from "@playwright/test";
import { preview } from "vite";
const server = await preview({
  root: new URL("../", import.meta.url).pathname,
  preview: { host: "127.0.0.1", port: 5173 },
});
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BIRD_TEST_BROWSER,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto("http://127.0.0.1:5173/#identify");
  await page.locator("#file").waitFor({ state: "attached" });
  await page.route("**/model/model.json", (route) => route.abort());
  await page
    .locator("#file")
    .setInputFiles(
      new URL("../../assets/nepal-bird-hero.webp", import.meta.url).pathname,
    );
  await page
    .getByRole("button", { name: "Identify this bird", exact: true })
    .click();
  await page
    .locator("#model-status")
    .filter({ hasText: "could not finish" })
    .waitFor();
  await page.unroute("**/model/model.json");
  await page
    .getByRole("button", { name: "Identify this bird", exact: true })
    .click();
  await page.locator(".result").first().waitFor({ timeout: 120000 });
  const names = await page.locator(".result h3").allTextContents();
  console.log("Production upload after retry:", names);
  if (
    JSON.stringify(names) !==
    JSON.stringify([
      "Himalayan Monal",
      "Blue-eared Kingfisher",
      "Asian Fairy-bluebird",
    ])
  )
    throw new Error("Production ranking differs from Python reference");
  await page.locator("#crop").fill("12");
  await page.locator("#crop").dispatchEvent("input");
  if (await page.locator(".result").count())
    throw new Error("Stale results after cropping");
  await page
    .getByRole("button", { name: "Identify this bird", exact: true })
    .click();
  await page.locator(".result").first().waitFor({ timeout: 120000 });
  console.log(
    "Crop rerun returned three results:",
    await page.locator(".result").count(),
  );
  console.log("Page errors:", errors);
  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
