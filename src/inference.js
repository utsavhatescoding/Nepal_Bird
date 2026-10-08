let modelPromise;
export async function loadBirdModel(onProgress = () => {}) {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import("@tensorflow/tfjs");
      try {
        await tf.setBackend("webgl");
      } catch {
        await tf.setBackend("cpu");
      }
      await tf.ready();
      const model = await tf.loadGraphModel("/model/model.json", {
        onProgress,
      });
      return { tf, model };
    })().catch((error) => {
      modelPromise = null;
      throw error;
    });
  }
  return modelPromise;
}
export async function identifyBird(pixels, onProgress) {
  const { tf, model } = await loadBirdModel(onProgress);
  const input = tf.tidy(() =>
    tf.tensor3d(pixels, [224, 224, 3], "float32").expandDims(0),
  );
  let output;
  try {
    output = await model.executeAsync(input);
    const scoresTensor = Array.isArray(output) ? output[0] : output;
    const scores = Array.from(await scoresTensor.data());
    if (scores.length !== 85 || scores.some((x) => !Number.isFinite(x)))
      throw new Error("Unexpected model output.");
    return scores
      .map((score, index) => ({ index, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  } finally {
    input.dispose();
    if (output)
      (Array.isArray(output) ? output : [output]).forEach((t) => t.dispose());
  }
}
