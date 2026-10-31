"use client";

import { useRef, useState } from "react";
import { Icon } from "./icons";
import { extractBiodataAction } from "@/lib/actions/import";
import { IMPORT_ACCEPT, MAX_IMPORT_BYTES, extractText, importKind } from "@/lib/biodata-import/extract";
import { parseBiodataText, type Imported } from "@/lib/biodata-import/parse";
import { bn } from "@/lib/bn";

/**
 * "ফাইল থেকে ভরুন": a photo, PDF or Word file of an existing biodata fills the form's fields, which the person then
 * checks. With `ai` the file goes to the server and Claude reads it; without, everything happens in the browser:
 * the file's text (or OCR for a photo) and the rule-based parser. Nothing is submitted by this component.
 */
export function BiodataImport({ ai, onResult }: { ai: boolean; onResult: (fields: Imported) => void }) {
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
        setStatus("ফাইল পাঠানো হচ্ছে, AI পড়ছে…");
        const form = new FormData();
        form.set("file", file);
        const result = await extractBiodataAction(form);
        if (!result.ok) throw new Error(result.error);
        fields = result.fields;
      } else {
        const text = await extractText(file, setStatus);
        if (ai) {
          setStatus("লেখা পাঠানো হচ্ছে, AI পড়ছে…");
          const form = new FormData();
          form.set("text", text);
          const result = await extractBiodataAction(form);
          if (!result.ok) throw new Error(result.error);
          fields = result.fields;
        } else {
          setStatus("তথ্য সাজানো হচ্ছে…");
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
        msg === "unsupported" ? "শুধু ছবি (JPG/PNG), PDF বা Word (.docx) ফাইল দেওয়া যায়।"
          : msg === "too_big" ? "ফাইলটি বড় বেশি (১০ মেগাবাইটের বেশি)। ছোট করে আবার দিন।"
            : msg === "empty" ? "ফাইলটি থেকে কিছু পড়া গেল না। আরও পরিষ্কার ছবি দিন, বা ঘরগুলো নিজেই লিখুন।"
              : msg && /[ঀ-৿]/.test(msg) ? msg : "ফাইলটি পড়া গেল না। অন্য ছবি দিন, বা ঘরগুলো নিজেই লিখুন।",
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
          <p className="font-bold">আগে থেকে বায়োডাটা লেখা আছে? ছবি বা ফাইল দিন</p>
          <p className="text-sm text-muted">
            বায়োডাটার ছবি তুলে দিন, বা PDF / Word ফাইল দিন। আমরা পড়ে নিচের ঘরগুলো ভরে দেব। তারপর আপনি একবার দেখে নেবেন, ভুল থাকলে ঠিক করবেন।{" "}
            {ai ? "ফাইলটি পড়ার জন্য সার্ভারে পাঠানো হয়, পড়ার পর রাখা হয় না।" : "ফাইলটি আপনার ফোনেই থাকে, বাইরে যায় না।"}
          </p>
        </div>
      </div>
      <input ref={input} type="file" accept={IMPORT_ACCEPT} className="sr-only" id="biodata-file"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handle(f); }} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} onClick={() => input.current?.click()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-primary bg-surface px-4 font-bold text-primary disabled:opacity-60">
          <Icon name={busy ? "sparkle" : "plus"} size={18} />{busy ? "পড়া হচ্ছে…" : "ছবি বা ফাইল বাছুন"}
        </button>
        {status ? <p role="status" className="text-sm text-muted">{status}</p> : null}
        {done ? <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-pos"><Icon name="check" size={16} />{bn(done)}টি ঘর ভরে দেওয়া হয়েছে। নিচে একবার দেখে নিন।</p> : null}
      </div>
      {error ? <p role="alert" className="rounded-2xl bg-neg-soft px-4 py-3 text-sm font-semibold text-neg">{error}</p> : null}
    </div>
  );
}
