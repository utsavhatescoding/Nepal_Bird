// Match Pillow's antialiased bilinear resize rather than browser-dependent canvas scaling.
const precision = 2 ** 22;
function coefficients(size, target) {
  const scale = size / target,
    support = Math.max(1, scale);
  return Array.from({ length: target }, (_, position) => {
    const centre = (position + 0.5) * scale;
    const start = Math.max(0, Math.floor(centre - support + 0.5));
    const end = Math.min(size, Math.floor(centre + support + 0.5));
    const weights = [];
    let total = 0;
    for (let source = start; source < end; source++) {
      const weight = Math.max(
        0,
        1 - Math.abs((source - centre + 0.5) / support),
      );
      weights.push(weight);
      total += weight;
    }
    return {
      start,
      weights: weights.map((weight) =>
        Math.floor((weight / total) * precision + 0.5),
      ),
    };
  });
}
export function resizeRGB(rgba, width, height, target = 224) {
  const xWeights = coefficients(width, target),
    yWeights = coefficients(height, target);
  const horizontal = new Uint8Array(target * height * 3),
    result = new Uint8Array(target * target * 3);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < target; x++) {
      const { start, weights } = xWeights[x];
      for (let channel = 0; channel < 3; channel++) {
        let sum = precision / 2;
        for (let k = 0; k < weights.length; k++)
          sum += rgba[(y * width + start + k) * 4 + channel] * weights[k];
        horizontal[(y * target + x) * 3 + channel] = Math.max(
          0,
          Math.min(255, Math.floor(sum / precision)),
        );
      }
    }
  for (let y = 0; y < target; y++)
    for (let x = 0; x < target; x++) {
      const { start, weights } = yWeights[y];
      for (let channel = 0; channel < 3; channel++) {
        let sum = precision / 2;
        for (let k = 0; k < weights.length; k++)
          sum +=
            horizontal[((start + k) * target + x) * 3 + channel] * weights[k];
        result[(y * target + x) * 3 + channel] = Math.max(
          0,
          Math.min(255, Math.floor(sum / precision)),
        );
      }
    }
  return result;
}
export function preparePixels(image, cropPercent = 0) {
  const w = image.naturalWidth,
    h = image.naturalHeight,
    mx = Math.floor((w * cropPercent) / 100),
    my = Math.floor((h * cropPercent) / 100);
  const canvas = document.createElement("canvas");
  canvas.width = w - 2 * mx;
  canvas.height = h - 2 * my;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(
    image,
    mx,
    my,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return resizeRGB(data, canvas.width, canvas.height);
}
