"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/client";

/**
 * The filter column of a list. On a phone it starts folded behind a "ফিল্টার" button, so the cards are one
 * scroll away; on a wide screen it is always open down the left. The form inside is rendered by the server; picking
 * from a dropdown searches at once, typed words wait for Enter or the search button.
 */
export function FilterPanel({ active, children }: { active: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { t, n } = useT();
  const badge = active ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-on-primary">{n(active)}</span> : null;
  return (
    <aside className="rounded-2xl border border-line bg-surface lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:scrollbar-thin">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="filters"
        className="flex min-h-12 w-full items-center justify-center gap-2 px-4 font-display text-base font-bold lg:hidden">
        <Icon name="filter" size={20} className="text-primary" />
        {t("filter.title")}
        {badge}
        <Icon name="chevronRight" size={18} className={`text-muted transition-transform ${open ? "-rotate-90" : "rotate-90"}`} />
      </button>
      <div className="hidden min-h-14 items-center justify-center gap-2 border-b border-line px-4 font-display text-base font-bold lg:flex">
        <Icon name="filter" size={20} className="text-primary" />
        {t("filter.title")}
        {badge}
      </div>
      <div id="filters" onChange={(e) => { if (e.target instanceof HTMLSelectElement) e.target.form?.requestSubmit(); }} className={`${open ? "block" : "hidden"} border-t border-line lg:block lg:border-t-0`}>{children}</div>
    </aside>
  );
}
