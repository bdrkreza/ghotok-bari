"use server";

import { requireUser } from "../auth/session";
import { aiAvailable, extractWithAi } from "../biodata-import/ai";
import type { Imported } from "../biodata-import/parse";
import { AppError, messageFor } from "../errors";
import { getLang } from "../i18n/server";

const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export type ImportResult = { ok: true; fields: Imported } | { ok: false; error: string };

/**
 * The AI reading of a biodata file, for the "ফাইল থেকে ভরুন" button when the site has an API key. Any signed-in
 * account may use it (a family on their own form, the ghotok on theirs). The file is read and forgotten: nothing
 * is stored, only the fields go back to the browser to fill the form.
 */
export async function extractBiodataAction(form: FormData): Promise<ImportResult> {
  const [, lang] = await Promise.all([requireUser(), getLang()]);
  if (!aiAvailable()) return { ok: false, error: messageFor("import_failed", lang) };
  try {
    const text = String(form.get("text") ?? "").trim();
    const file = form.get("file");
    if (text) return { ok: true, fields: await extractWithAi({ type: "text", text: text.slice(0, 40_000) }) };
    if (!(file instanceof File) || file.size === 0) throw new AppError("invalid_input");
    if (file.size > MAX_BYTES) throw new AppError("file_too_big");
    const data = Buffer.from(await file.arrayBuffer());
    const image = IMAGE_TYPES.find((t) => t === file.type);
    if (image) return { ok: true, fields: await extractWithAi({ type: "image", mediaType: image, data }) };
    if (file.type === "application/pdf") return { ok: true, fields: await extractWithAi({ type: "pdf", data }) };
    throw new AppError("invalid_input");
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: messageFor(e.code, lang) };
    console.error("biodata import failed", e);
    return { ok: false, error: messageFor("import_failed", lang) };
  }
}
