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
  try {
    const out: string[] = [];
    for (const image of images) {
      const { data } = await worker.recognize(image);
      out.push(data.text);
    }
    return out.join("\n");
  } finally {
    await worker.terminate();
  }
}
