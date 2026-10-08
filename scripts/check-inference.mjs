import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { writeFile, readFile } from "node:fs/promises";
const server = await createServer({
  root: new URL("../", import.meta.url).pathname,
  server: { host: "127.0.0.1", port: 5173 },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route("**/__fixtures/**", async (route) => {
  const name = new URL(route.request().url()).pathname.split("/").pop();
  await route.fulfill({
    body: await readFile(new URL(`./fixtures/${name}`, import.meta.url)),
    contentType: name.endsWith(".json")
      ? "application/json"
      : "application/octet-stream",
  });
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:5173/#identify");
  await page.locator("#file").waitFor({ state: "attached" });
  const parity = await page.evaluate(async () => {
    const { loadBirdModel } = await import("/src/inference.js");
    const { tf, model } = await loadBirdModel();
    const fixtures = await (await fetch("/__fixtures/parity.json")).json();
    const rows = [];
    for (const fixture of fixtures) {
      const values = new Float32Array(
        await (
          await fetch(`/__fixtures/${fixture.name}.input.bin`)
        ).arrayBuffer(),
      );
      const input = tf.tensor4d(values, [1, 224, 224, 3]);
      const start = performance.now();
      const output = await model.executeAsync(input);
      const scores = Array.from(await output.data());
      const top3 = scores
        .map((score, index) => ({ score, index }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((x) => x.index);
      rows.push({
        name: fixture.name,
        backend: tf.getBackend(),
        seconds: (performance.now() - start) / 1000,
        maxError: Math.max(
          ...scores.map((x, i) => Math.abs(x - fixture.scores[i])),
        ),
        top3,
        pythonTop3: fixture.top3,
      });
      input.dispose();
      output.dispose();
    }
    return rows;
  });
  const preprocessing = await page.evaluate(async () => {
    const { preparePixels } = await import("/src/preprocess.js");
    const image = new Image();
    image.src = "/assets/nepal-bird-hero.webp";
    await image.decode();
    const pixels = preparePixels(image);
    const reference = new Float32Array(
      await (await fetch("/__fixtures/hero.input.bin")).arrayBuffer(),
    );
    return {
      maxPixelDifference: pixels.reduce(
        (m, x, i) => Math.max(m, Math.abs(x - reference[i])),
        0,
      ),
      differentPixels: pixels.reduce((n, x, i) => n + (x !== reference[i]), 0),
    };
  });
  console.log("Preprocessing:", preprocessing);
  console.log("Browser parity:", JSON.stringify(parity));
  for (const row of parity) {
    if (
      row.maxError > 0.001 ||
      JSON.stringify(row.top3) !== JSON.stringify(row.pythonTop3)
    )
      throw new Error(`Browser parity failed: ${row.name}`);
  }
  await page
    .locator("#file")
    .setInputFiles(
      new URL("../../assets/nepal-bird-hero.webp", import.meta.url).pathname,
    );
  await page
    .getByRole("button", { name: "Identify this bird", exact: true })
    .click();
  await page.locator(".result").first().waitFor({ timeout: 120000 });
  const resultNames = await page.locator(".result h3").allTextContents();
  console.log("Upload results:", resultNames);
  if (
    JSON.stringify(resultNames) !==
    JSON.stringify([
      "Himalayan Monal",
      "Blue-eared Kingfisher",
      "Asian Fairy-bluebird",
    ])
  )
    throw new Error("Upload ranking differs from Python reference");
  console.log("Status:", await page.locator("#model-status").textContent());
  await page.screenshot({
    path: "/tmp/bird-identification.png",
    fullPage: true,
  });
  await page.locator("[data-save]").first().click();
  await page.locator("[name=note]").fill("Browser upload test");
  await page
    .getByRole("button", { name: "Save field note", exact: true })
    .click();
  await page.goto("http://127.0.0.1:5173/#notebook");
  await page.locator(".notebook-item").waitFor();
  await page.reload();
  await page.locator(".notebook-item").waitFor();
  console.log("Saved observation survives reload.");
  await writeFile(
    new URL("./browser-parity.json", import.meta.url),
    JSON.stringify({ parity, errors }, null, 2),
  );
  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  await browser.close();
  await server.close();
}
