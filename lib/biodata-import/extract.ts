// Browser only: the text of an uploaded biodata, without any server. Word and PDF files usually carry real text,
// which is read exactly; a photo, or a PDF that is only a scan, goes through OCR (Tesseract.js, Bangla + English).
// The heavy libraries load on first use, so a page that never imports anything never downloads them.

export type Progress = (message: string) => void;

/** The progress lines, in the user's language (the component passes them in; this module has no language of its own). */
export interface ProgressLabels {
  word: string;
  pdf: string;
  ocrFirst: string;
  ocrPrep: string;
  ocrProgress: (percent: number) => string;
}

export const IMPORT_ACCEPT = "image/*,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const MAX_PDF_PAGES = 5;

export type ImportKind = "image" | "pdf" | "docx";

export function importKind(file: File): ImportKind | null {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx") || file.type.includes("wordprocessingml")) return "docx";
  return null;
}

/** The document's text, as well as the browser can get it. Throws on an unreadable file. */
export async function extractText(file: File, onProgress: Progress, labels: ProgressLabels): Promise<string> {
  const kind = importKind(file);
  if (!kind) throw new Error("unsupported");
  if (kind === "docx") {
    onProgress(labels.word);
    const mammoth = await import("mammoth/mammoth.browser.min.js");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return value;
  }
  if (kind === "pdf") {
    onProgress(labels.pdf);
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = Math.min(pdf.numPages, MAX_PDF_PAGES);
    const text: string[] = [];
    const images: Blob[] = [];
    for (let n = 1; n <= pages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      text.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" ").replace(/\s{2,}/g, "\n"));
      // a scanned PDF has no text layer: draw the page and read it like a photo
      if (text.join("").trim().length < 80) {
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
        images.push(await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("render"))), "image/png")));
      }
    }
    const typed = text.join("\n").trim();
    if (typed.length >= 80) return typed;
    return ocr(images, onProgress, labels);
  }
  return ocr([file], onProgress, labels);
}

/**
 * A photo made easy for the engine: scaled so its long side is about 2600px, turned grey, then black-and-white by an
 * adaptive threshold (each pixel against its own neighbourhood), so text on a coloured or shaded background becomes
 * black on white. A two-column sheet, the usual designed CV, is cut at the white gutter between the columns and comes
 * back as two images, left then right; read whole, the engine glues the two columns' lines together. Anything that
 * goes wrong hands the original back untouched.
 */
async function prepare(image: Blob): Promise<Blob[]> {
  try {
    const bitmap = await createImageBitmap(image);
    const scale = Math.max(1, Math.min(3, 2600 / Math.max(bitmap.width, bitmap.height)));
    const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const im = ctx.getImageData(0, 0, w, h);
    const d = im.data;
    const grey = new Uint8ClampedArray(w * h);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) grey[p] = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    // an integral image gives the mean of any window in four reads
    const W = w + 1;
    const sum = new Float64Array(W * (h + 1));
    for (let y = 1; y <= h; y++) {
      let row = 0;
      for (let x = 1; x <= w; x++) { row += grey[(y - 1) * w + (x - 1)]; sum[y * W + x] = sum[(y - 1) * W + x] + row; }
    }
    const r = Math.round(Math.max(w, h) / 60); // half the window: a few letters wide
    const C = 12; // how much darker than its surroundings a pixel must be to count as ink
    const ink = new Uint32Array(w); // ink per column of pixels, for finding the gutter
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
        const mean = (sum[y1 * W + x1] - sum[y0 * W + x1] - sum[y1 * W + x0] + sum[y0 * W + x0]) / ((x1 - x0) * (y1 - y0));
        const black = grey[y * w + x] < mean - C;
        if (black) ink[x]++;
        const i = (y * w + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = black ? 0 : 255;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(im, 0, 0);
    // the gutter: the widest run of near-empty pixel columns across the middle half of the page
    const limit = h * 0.004;
    let best: { at: number; width: number } | null = null;
    let start = -1;
    const from = Math.round(w * 0.25), to = Math.round(w * 0.75);
    for (let x = from; x <= to; x++) {
      const empty = x < to && ink[x] <= limit;
      if (empty && start < 0) start = x;
      if (!empty && start >= 0) {
        if (!best || x - start > best.width) best = { at: Math.round((start + x) / 2), width: x - start };
        start = -1;
      }
    }
    const slices: [number, number][] = best && best.width >= w * 0.012 ? [[0, best.at], [best.at, w]] : [[0, w]];
    const blobs: Blob[] = [];
    for (const [x0, x1] of slices) {
      const part = document.createElement("canvas");
      part.width = x1 - x0; part.height = h;
      part.getContext("2d")!.drawImage(canvas, x0, 0, x1 - x0, h, 0, 0, x1 - x0, h);
      blobs.push(await new Promise<Blob>((resolve, reject) => part.toBlob((b) => (b ? resolve(b) : reject(new Error("render"))), "image/png")));
    }
    return blobs;
  } catch {
    return [image];
  }
}

/** Bangla and English OCR in the browser. The language data comes from Tesseract.js's CDN on first use. */
async function ocr(images: Blob[], onProgress: Progress, labels: ProgressLabels): Promise<string> {
  onProgress(labels.ocrFirst);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["ben", "eng"], 1, {
    logger: (m) => {
      if (m.status === "recognizing text") onProgress(labels.ocrProgress(Math.round(m.progress * 100)));
      else if (/loading|initializ/.test(m.status)) onProgress(labels.ocrPrep);
    },
  });
  const read = async (pages: Blob[]) => {
    const out: string[] = [];
    for (const page of pages) {
      const { data } = await worker.recognize(page);
      out.push(data.text);
    }
    return out.join("\n");
  };
  try {
    onProgress(labels.ocrPrep);
    const cleaned = (await Promise.all(images.map(prepare))).flat();
    const text = await read(cleaned);
    // a photo the cleaning did not suit (very little came back): try it as it was and keep the fuller reading
    if (text.replace(/\s+/g, "").length < 80) {
      const plain = await read(images);
      return plain.replace(/\s+/g, "").length > text.replace(/\s+/g, "").length ? plain : text;
    }
    return text;
  } finally {
    await worker.terminate();
  }
}
