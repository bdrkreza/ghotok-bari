"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/client";

/** How many visits still get the little sideways nudge, counted in this browser. */
const NUDGES = 3;
const NUDGE_KEY = "alta-row-nudge";

/**
 * A row of tabs that slides sideways when it does not fit. So nobody misses the tabs off the edge, the edge that has
 * more fades out under a round arrow (a tap slides the row along), and on the first few visits the row slides a
 * little way and back by itself. The open tab is scrolled into view on arrival.
 */
export function ScrollRow({ label, children }: { label: string; children: ReactNode }) {
  const { t } = useT();
  const row = useRef<HTMLElement>(null);
  const [more, setMore] = useState({ left: false, right: false });

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const update = () => setMore({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    const resize = new ResizeObserver(update);
    el.addEventListener("scroll", update, { passive: true });
    resize.observe(el);

    const open = el.querySelector<HTMLElement>("[aria-current=page]");
    const hidden = open && (open.offsetLeft < el.scrollLeft || open.offsetLeft + open.offsetWidth > el.scrollLeft + el.clientWidth);
    let back = 0;
    if (hidden) el.scrollTo({ left: open.offsetLeft - 8 });
    else if (el.scrollWidth > el.clientWidth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let seen = NUDGES;
      try { seen = Number(localStorage.getItem(NUDGE_KEY) ?? 0); } catch { /* storage blocked: no nudge */ }
      if (seen < NUDGES) {
        try { localStorage.setItem(NUDGE_KEY, String(seen + 1)); } catch { /* fine */ }
        el.scrollTo({ left: 56, behavior: "smooth" });
        back = window.setTimeout(() => el.scrollTo({ left: 0, behavior: "smooth" }), 700);
      }
    }
    update();
    return () => {
      el.removeEventListener("scroll", update);
      resize.disconnect();
      clearTimeout(back);
    };
  }, []);

  const slide = (dir: number) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.6, behavior: "smooth" });
  const edge = "absolute inset-y-0 flex w-14 items-center transition-opacity";
  const arrow = "grid size-8 place-items-center rounded-full border border-line bg-surface text-primary shadow-md";
  return (
    <div className="relative">
      <nav ref={row} aria-label={label} className="flex gap-1 overflow-x-auto overflow-y-hidden px-2 scrollbar-none">
        {children}
      </nav>
      <div className={`${edge} left-0 justify-start bg-linear-to-l from-surface/0 via-surface/90 to-surface pl-1.5 ${more.left ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <button type="button" onClick={() => slide(-1)} aria-label={t("common.scrollBack")} tabIndex={more.left ? 0 : -1} className={arrow}>
          <Icon name="back" size={16} strokeWidth={2.4} />
        </button>
      </div>
      <div className={`${edge} right-0 justify-end bg-linear-to-r from-surface/0 via-surface/90 to-surface pr-1.5 ${more.right ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <button type="button" onClick={() => slide(1)} aria-label={t("common.scrollMore")} tabIndex={more.right ? 0 : -1} className={arrow}>
          <Icon name="chevronRight" size={16} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
