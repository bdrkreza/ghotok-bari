"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";
import { useT } from "@/lib/i18n/client";
import { shrinkImage } from "@/lib/shrink-image";

/** Up to this many pictures; the server says the same (lib/services/photos.ts). */
const MAX = 5;

type Item = { kind: "kept"; id: string; src: string } | { kind: "new"; key: string; file: File; src: string };

/**
 * The person's photos in the biodata form: up to five, all optional. Pictures already saved show first; new ones are
 * shrunk in the browser to at most 100 KB whatever their size (lib/shrink-image.ts) and go with the form's submit
 * (a hidden file input named `photos`), and `photoOrder` says the order, saved ones as "k:<id>" and new ones as
 * "n:<index>". The first picture is the one on the cards; any other can be moved there. Without JavaScript nothing is
 * shown and the saved photos stay as they are.
 */
export function PhotoPicker({ saved }: { saved: { id: string }[] }) {
  const { t } = useT();
  const [items, setItems] = useState<Item[]>(() => saved.map((p) => ({ kind: "kept", id: p.id, src: `/api/photos/${p.id}` })));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const filesRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);

  // the new pictures ride along in a hidden file input, in the order they appear
  const fresh = useMemo(() => items.filter((i): i is Extract<Item, { kind: "new" }> => i.kind === "new"), [items]);
  useEffect(() => {
    if (!filesRef.current) return;
    const dt = new DataTransfer();
    for (const i of fresh) dt.items.add(i.file);
    filesRef.current.files = dt.files;
  }, [fresh]);
  // the previews' object URLs: let each go when its picture is removed, and the rest when the form goes away
  const latest = useRef(items);
  useEffect(() => { latest.current = items; }, [items]);
  useEffect(() => () => { for (const i of latest.current) if (i.kind === "new") URL.revokeObjectURL(i.src); }, []);

  const add = async (list: FileList | null) => {
    if (!list?.length) return;
    const room = MAX - items.length;
    const chosen = [...list].slice(0, Math.max(0, room));
    setNote(list.length > room ? t("photo.tooMany", { n: MAX }) : "");
    setBusy(true);
    const made: Item[] = [];
    for (const file of chosen) {
      try {
        const small = await shrinkImage(file);
        made.push({ kind: "new", key: crypto.randomUUID(), file: small, src: URL.createObjectURL(small) });
      } catch {
        setNote(t("photo.cannotOpen"));
      }
    }
    setItems((now) => [...now, ...made].slice(0, MAX));
    setBusy(false);
    if (pickRef.current) pickRef.current.value = "";
  };
  const remove = (at: number) => {
    const gone = items[at];
    if (gone?.kind === "new") URL.revokeObjectURL(gone.src);
    setItems((now) => now.filter((_, i) => i !== at));
  };
  const toFront = (at: number) => setItems((now) => [now[at], ...now.filter((_, i) => i !== at)]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{t("photo.title")}</p>
          <p className="text-sm text-muted">{t("photo.hint", { n: MAX })}</p>
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-muted">{t("photo.count", { n: items.length, max: MAX })}</span>
      </div>

      {/* what the form posts */}
      <input ref={filesRef} type="file" name="photos" multiple hidden tabIndex={-1} aria-hidden />
      {items.length
        ? items.map((item) => <input key={item.kind === "kept" ? item.id : item.key} type="hidden" name="photoOrder" value={item.kind === "kept" ? `k:${item.id}` : `n:${fresh.indexOf(item)}`} />)
        : <input type="hidden" name="photoOrder" value="" />}

      {items.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item, i) => (
            <li key={item.kind === "kept" ? item.id : item.key} className="flex flex-col gap-1.5">
              <div className={`relative aspect-[3/4] overflow-hidden rounded-xl border bg-sunk ${i === 0 ? "border-primary ring-2 ring-primary/30" : "border-line"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- a local preview or the app's own photo route */}
                <img src={item.src} alt={t("photo.alt", { n: i + 1 })} className="size-full object-cover" />
                {i === 0 ? <span className="absolute top-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-on-primary">{t("photo.cover")}</span> : null}
              </div>
              <div className="flex gap-1.5">
                {i > 0 ? (
                  <button type="button" onClick={() => toFront(i)} className="min-h-9 flex-1 rounded-lg border border-line px-2 text-xs font-bold hover:border-primary/50">{t("photo.makeCover")}</button>
                ) : null}
                <button type="button" onClick={() => remove(i)} aria-label={t("photo.removeAria", { n: i + 1 })}
                  className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-line px-2 text-xs font-bold text-neg hover:border-neg/50">
                  <Icon name="trash" size={14} />{t("photo.remove")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {items.length < MAX ? (
        <label className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/50 px-4 font-bold text-primary hover:bg-primary-soft ${busy ? "pointer-events-none opacity-60" : ""}`}>
          <input ref={pickRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => add(e.target.files)} disabled={busy} />
          <Icon name="plus" size={18} />
          {busy ? t("photo.working") : items.length ? t("photo.addMore", { n: MAX - items.length }) : t("photo.add")}
        </label>
      ) : null}
      {note ? <p role="status" className="text-sm font-semibold text-warn-ink">{note}</p> : null}
      <p className="flex items-start gap-1.5 text-xs text-muted"><Icon name="lock" size={13} className="mt-0.5 shrink-0" />{t("photo.private")}</p>
    </div>
  );
}
