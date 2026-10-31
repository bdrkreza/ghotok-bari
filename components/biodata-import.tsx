"use client";

import { useRef, useState } from "react";
import { Icon } from "./icons";
import { extractBiodataAction } from "@/lib/actions/import";
import { IMPORT_ACCEPT, MAX_IMPORT_BYTES, extractText, importKind } from "@/lib/biodata-import/extract";
import { parseBiodataText, type Imported } from "@/lib/biodata-import/parse";
import { useT } from "@/lib/i18n/client";

/**
 * "ফাইল থেকে ভরুন": a photo, PDF or Word file of an existing biodata fills the form's fields, which the person then
 * checks. With `ai` the file goes to the server and Claude reads it; without, everything happens in the browser:
 * the file's text (or OCR for a photo) and the rule-based parser. Nothing is submitted by this component.
 */
export function BiodataImport({ ai, onResult }: { ai: boolean; onResult: (fields: Imported) => void }) {
  const { t } = useT();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  async function handle(file: File) {
    setError(null); setDone(null); setBusy(true);
    try {
      if (!importKind(file)) throw new Error("unsupported");
      if (file.size > MAX_IMPORT_BYTES) throw new Error("too_big");
      let fields: Imported;
      if (ai && importKind(file) !== "docx") {
        setStatus(t("import.sendingFile"));
        const form = new FormData();
        form.set("file", file);
        const result = await extractBiodataAction(form);
        if (!result.ok) throw new Error(result.error);
        fields = result.fields;
      } else {
        const text = await extractText(file, setStatus, {
          word: t("import.readingWord"), pdf: t("import.readingPdf"), ocrFirst: t("import.ocrFirst"), ocrPrep: t("import.ocrPrep"),
          ocrProgress: (p) => t("import.ocrProgress", { p }),
        });
        if (ai) {
          setStatus(t("import.sendingText"));
          const form = new FormData();
          form.set("text", text);
          const result = await extractBiodataAction(form);
          if (!result.ok) throw new Error(result.error);
          fields = result.fields;
        } else {
          setStatus(t("import.arranging"));
          fields = parseBiodataText(text);
        }
      }
      const n = Object.keys(fields).filter((k) => k !== "kind").length;
      if (!n) throw new Error("empty");
      onResult(fields);
      setDone(n);
      setStatus(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setStatus(null);
      setError(
        msg === "unsupported" ? t("import.errUnsupported")
          : msg === "too_big" ? t("import.errTooBig")
            : msg === "empty" ? t("import.errEmpty")
              // a message the server already wrote in the user's language
              : msg && msg.length > 12 && !/^[a-z_]+$/.test(msg) ? msg : t("import.errFailed"),
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-dashed border-primary/40 bg-primary-soft/30 p-4 lg:p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-primary"><Icon name="note" size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{t("import.title")}</p>
          <p className="text-sm text-muted">{t("import.text")} {ai ? t("import.privacyAi") : t("import.privacyLocal")}</p>
        </div>
      </div>
      <input ref={input} type="file" accept={IMPORT_ACCEPT} className="sr-only" id="biodata-file"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handle(f); }} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} onClick={() => input.current?.click()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-primary bg-surface px-4 font-bold text-primary disabled:opacity-60">
          <Icon name={busy ? "sparkle" : "plus"} size={18} />{busy ? t("import.reading") : t("import.button")}
        </button>
        {status ? <p role="status" className="text-sm text-muted">{status}</p> : null}
        {done ? <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-pos"><Icon name="check" size={16} />{t("import.done", { n: done })}</p> : null}
      </div>
      {error ? <p role="alert" className="rounded-2xl bg-neg-soft px-4 py-3 text-sm font-semibold text-neg">{error}</p> : null}
    </div>
  );
}
