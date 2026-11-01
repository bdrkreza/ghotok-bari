// Making a photo small in the browser before it is uploaded: whatever its size (a 20 MB camera photo included), the
// result is a JPEG of at most TARGET bytes. It starts at SIDE pixels on the longest side and a good quality, then
// lowers the quality, then the size, until it fits; MIN_SIDE keeps a face recognisable.

/** the most a photo may weigh after shrinking */
export const TARGET_BYTES = 100 * 1024;
const SIDE = 1280;
const MIN_SIDE = 480;
/** qualities tried at each size, best first */
const QUALITIES = [0.82, 0.72, 0.62, 0.52];
/** each round that still does not fit makes the picture this much smaller */
const STEP = 0.8;

const encode = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("could not encode"))), "image/jpeg", quality));

/** Draw the picture at `side` pixels on its longest side (never larger than it is), on white for transparent PNGs. */
function draw(bitmap: ImageBitmap, side: number): HTMLCanvasElement {
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** The photo as a JPEG of at most TARGET_BYTES (or the smallest it gets at MIN_SIDE, which is well under it in practice). */
export async function shrinkImage(file: File): Promise<File> {
  // turned upright as the camera meant it
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    let side = Math.min(SIDE, Math.max(bitmap.width, bitmap.height));
    let smallest: Blob | null = null;
    for (;;) {
      const canvas = draw(bitmap, side);
      for (const q of QUALITIES) {
        const blob = await encode(canvas, q);
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= TARGET_BYTES) return asFile(blob, file.name);
      }
      if (side <= MIN_SIDE) break;
      side = Math.max(MIN_SIDE, Math.round(side * STEP));
    }
    return asFile(smallest!, file.name);
  } finally {
    bitmap.close();
  }
}

const asFile = (blob: Blob, name: string) => new File([blob], name.replace(/\.[^.]*$/, "") + ".jpg", { type: "image/jpeg" });
