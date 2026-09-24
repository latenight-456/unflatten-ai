function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

export async function downscaleForApi(
  dataUrl: string,
  maxDim = 1600,
  maxChars = 3_000_000
): Promise<{ dataUrl: string; mimeType: "image/jpeg"; width: number; height: number }> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.85;
  let out = canvas.toDataURL("image/jpeg", quality);
  while (out.length > maxChars && quality > 0.4) {
    quality -= 0.1;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  if (out.length > maxChars) {
    throw new Error("Image is too large to analyze. Try a smaller image.");
  }
  return { dataUrl: out, mimeType: "image/jpeg", width, height };
}
