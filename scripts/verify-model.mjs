import * as tf from "@tensorflow/tfjs";
import { readFile } from "node:fs/promises";
const root = new URL("../public/model/", import.meta.url);
const json = JSON.parse(await readFile(new URL("model.json", root), "utf8"));
const buffers = await Promise.all(
  json.weightsManifest
    .flatMap((x) => x.paths)
    .map((p) => readFile(new URL(p, root))),
);
const bytes = Buffer.concat(buffers);
const model = await tf.loadGraphModel({
  load: async () => ({
    modelTopology: json.modelTopology,
    weightSpecs: json.weightsManifest.flatMap((x) => x.weights),
    weightData: bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ),
    signature: json.signature,
    format: json.format,
    generatedBy: json.generatedBy,
    convertedBy: json.convertedBy,
  }),
});
const fixtureRoot = new URL("./fixtures/", import.meta.url);
const fixtures = JSON.parse(
  await readFile(new URL("parity.json", fixtureRoot), "utf8"),
);
for (const fixture of fixtures) {
  const buffer = await readFile(
    new URL(`${fixture.name}.input.bin`, fixtureRoot),
  );
  const values = new Float32Array(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
  );
  const input = tf.tensor4d(values, [1, 224, 224, 3]);
  const output = await model.executeAsync(input);
  const scores = Array.from(await output.data());
  const error = Math.max(
    ...scores.map((x, i) => Math.abs(x - fixture.scores[i])),
  );
  const top = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.index);
  console.log(
    JSON.stringify({
      fixture: fixture.name,
      maxAbsoluteError: error,
      top3: top,
      pythonTop3: fixture.top3,
    }),
  );
  if (error > 0.0001 || JSON.stringify(top) !== JSON.stringify(fixture.top3))
    throw new Error(`Parity failed for ${fixture.name}`);
  input.dispose();
  output.dispose();
}
model.dispose();
console.log("All reference tensors match Python within 0.0001.");
