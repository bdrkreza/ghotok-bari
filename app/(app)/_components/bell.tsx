"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ActionForm } from "@/components/form";
import { Icon, type IconName } from "@/components/icons";
import { dismissNoticeAction, seeNoticeAction } from "@/lib/actions/interests";
import { useT } from "@/lib/i18n/client";

/** Up to this many the badge shows the number; beyond it, "১০০+". */
const BADGE_MAX = 100;

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
  /** a family's notice they have already seen: kept in the list, faded, under "আগে দেখা" */
  seen?: boolean;
  /** a family's notice: opening it marks it seen */
  noticeId?: string;
}

/**
 * The bell in the top bar: a dot with the number of things waiting, and a list that opens under it. The ghotok's
 * list is what waits for them (biodata to approve, families' interest, calls due today), gone once done. A family's
 * is the news on their biodata: the unseen first under "নতুন", bold with a dot, then the ones already seen, faded,
 * under "আগে দেখা". Opening one marks it seen; "সব দেখেছি" marks them all. `count` (the badge) is the unseen only.
 */
export function Bell({ items, count, family = false, className = "" }: { items: BellItem[]; count: number; family?: boolean; className?: string }) {
  const { t, n } = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const unseen = items.filter((it) => !it.seen);
  const seen = items.filter((it) => it.seen);

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
            {count > BADGE_MAX ? `${n(BADGE_MAX)}+` : n(count)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div id="bell-list" className="absolute top-12 right-0 z-30 flex w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
          <p className="border-b border-line px-4 py-3 font-display font-bold">{t("bell.title")}</p>
          {items.length ? (
            // scrolls inside itself (never the page behind it) once the list is taller than the screen allows
            <div className="max-h-[min(24rem,60dvh)] overflow-y-auto overscroll-contain">
              {[{ key: "new", title: t("bell.unseen"), rows: unseen }, { key: "seen", title: t("bell.seen"), rows: seen }].map((group) => group.rows.length ? (
                <section key={group.key} aria-label={family ? group.title : undefined}>
                  {/* the headings only matter on a family's list; the ghotok's has nothing "seen" */}
                  {family ? <p className="sticky top-0 z-10 border-b border-line bg-sunk px-4 py-1.5 text-xs font-bold text-muted">{group.title}</p> : null}
                  <ul className="flex flex-col divide-y divide-line">
                    {group.rows.map((it) => (
                      <li key={it.key}>
                        <Link href={it.href} className={`flex items-start gap-3 px-4 py-3 hover:bg-sunk ${family && !it.seen ? "bg-primary-soft/30" : ""}`}
                          onClick={() => {
                            setOpen(false);
                            const id = it.noticeId;
                            if (id && !it.seen) startTransition(() => seeNoticeAction(id));
                          }}>
                          <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-full ${it.seen ? "bg-sunk text-muted" : it.tone === "warn" ? "bg-warn text-warn-ink" : "bg-primary-soft text-primary"}`}>
                            <Icon name={it.icon} size={18} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm ${it.seen ? "text-muted" : "font-bold"}`}>{it.text}</span>
                            {it.sub ? <span className="block truncate text-xs text-muted">{it.sub}</span> : null}
                          </span>
                          {family && !it.seen ? <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" /> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null)}
            </div>
          ) : (
            <p className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted">
              <Icon name="check" size={22} />{t("bell.empty")}
            </p>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
            <Link href={family ? "/me" : "/dashboard"} onClick={() => setOpen(false)} className="text-sm font-bold text-primary">{t("bell.seeAll")} →</Link>
            {family && unseen.length ? (
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
