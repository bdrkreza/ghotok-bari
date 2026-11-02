"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useT } from "@/lib/i18n/client";

export interface MoreItem {
  href: string;
  label: string;
  icon: IconName;
  on: boolean;
  /** what is new there; 0 shows nothing */
  badge: number;
}

/**
 * The web bar's "আরও ▾": the ghotok's screens that are not everyday (requests, interest, meetings, accounts), in a
 * list under the button, so the bar keeps one row at any width. Lit when one of them is open; the dot adds up what is
 * new in them. Closes on a pick, a click outside, Escape or a new screen, like the bell.
 */
export function MoreMenu({ items }: { items: MoreItem[] }) {
  const { t, n } = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
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

  const on = items.some((it) => it.on);
  const total = items.reduce((sum, it) => sum + it.badge, 0);
  return (
    <div ref={box} className="relative flex shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="more-list"
        className={`flex items-center gap-1 border-b-2 px-3 font-bold ${on ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}>
        {t("nav.more")}
        {total ? <span aria-hidden className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] leading-none text-on-primary">{n(total)}</span> : null}
        <Icon name="chevronRight" size={16} className={`transition-transform ${open ? "-rotate-90" : "rotate-90"}`} />
      </button>
      {open ? (
        // its own text colour: the bar's would carry over
        <ul id="more-list" className="absolute top-full right-0 z-30 mt-1 flex w-60 flex-col overflow-hidden rounded-2xl border border-line bg-surface py-1 text-ink shadow-lg">
          {items.map((it) => (
            <li key={it.href}>
              <Link href={it.href} aria-current={it.on ? "page" : undefined} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 font-semibold hover:bg-sunk ${it.on ? "text-primary" : ""}`}>
                <Icon name={it.icon} size={18} className={it.on ? "" : "text-muted"} />
                <span className="flex-1">{it.label}</span>
                {it.badge ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] leading-none font-bold text-on-primary">{n(it.badge)}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
