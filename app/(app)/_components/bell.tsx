"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ActionForm } from "@/components/form";
import { Icon, type IconName } from "@/components/icons";
import { dismissNoticeAction } from "@/lib/actions/interests";
import { useT } from "@/lib/i18n/client";

/** One line in the bell's list, already in the reader's language (the layout builds them on the server). */
export interface BellItem {
  key: string;
  text: string;
  /** a second, smaller line: the ghotok's note, or the date */
  sub?: string;
  href: string;
  icon: IconName;
  /** "warn" for what needs a decision or was sent back; the rest are good news */
  tone: "warn" | "news";
}

/**
 * The bell in the top bar: a dot with the number of things waiting, and a list that opens under it. The ghotok's
 * list is what waits for them (biodata to approve, families' interest, calls due today); a family's is the news on
 * their biodata, which they can mark read from here. `count` is what the badge shows; the list may be shorter.
 */
export function Bell({ items, count, family = false, className = "" }: { items: BellItem[]; count: number; family?: boolean; className?: string }) {
  const { t, n } = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // a new screen closes the list
  const [shownAt, setShownAt] = useState(pathname);
  if (shownAt !== pathname) {
    setShownAt(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const label = count ? t("bell.ariaCount", { n: count }) : t("bell.aria");
  return (
    <div ref={box} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="bell-list" aria-label={label} title={label}
        className={`relative grid size-10 place-items-center rounded-full border ${open ? "border-primary bg-primary-soft text-primary" : "border-line text-muted hover:bg-sunk"}`}>
        <Icon name="bell" size={20} />
        {count ? (
          <span aria-hidden className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] leading-none font-bold text-on-primary ring-2 ring-surface">
            {count > 9 ? `${n(9)}+` : n(count)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div id="bell-list" className="absolute top-12 right-0 z-30 flex w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
          <p className="border-b border-line px-4 py-3 font-display font-bold">{t("bell.title")}</p>
          {items.length ? (
            <ul className="flex max-h-96 flex-col divide-y divide-line overflow-y-auto">
              {items.map((it) => (
                <li key={it.key}>
                  <Link href={it.href} onClick={() => setOpen(false)} className="flex items-start gap-3 px-4 py-3 hover:bg-sunk">
                    <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-full ${it.tone === "warn" ? "bg-warn text-warn-ink" : "bg-primary-soft text-primary"}`}>
                      <Icon name={it.icon} size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{it.text}</span>
                      {it.sub ? <span className="block truncate text-xs text-muted">{it.sub}</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted">
              <Icon name="check" size={22} />{t("bell.empty")}
            </p>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
            <Link href={family ? "/me" : "/dashboard"} onClick={() => setOpen(false)} className="text-sm font-bold text-primary">{t("bell.seeAll")} →</Link>
            {family && items.length ? (
              <ActionForm action={dismissNoticeAction} tone="quiet" compact inline submitLabel={t("me.dismissAll")}>
                {() => null}
              </ActionForm>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
