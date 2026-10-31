"use client";

import { setLangAction } from "@/lib/actions/lang";
import { useT } from "@/lib/i18n/client";
import { LANGS, type Lang } from "@/lib/i18n";

const TONES = {
  /** on the page background and the bars */
  default: { pill: "border-line bg-surface", on: "bg-ink text-bg", off: "text-muted hover:text-ink" },
  /** on the deep-coloured sign-in panel */
  panel: { pill: "border-on-panel/30 bg-on-panel/10", on: "bg-on-panel text-panel", off: "text-on-panel/80 hover:text-on-panel" },
};

/** "বাং | EN": one tap switches the whole site's language. Works without JavaScript too, since it is a plain form. */
export function LangSwitch({ className = "", tone = "default" }: { className?: string; tone?: keyof typeof TONES }) {
  const { lang, t } = useT();
  const c = TONES[tone];
  return (
    <form action={setLangAction} aria-label={t("lang.aria")} className={`inline-flex rounded-full border p-0.5 ${c.pill} ${className}`}>
      {LANGS.map((l) => (
        <button key={l} type="submit" name="lang" value={l} aria-pressed={l === lang} lang={l}
          className={`min-h-9 rounded-full px-2.5 text-xs font-bold ${l === lang ? c.on : c.off}`}>
          {l === "bn" ? "বাং" : "EN"}
        </button>
      ))}
    </form>
  );
}

const NAMES: Record<Lang, "lang.bn" | "lang.en"> = { bn: "lang.bn", en: "lang.en" };

/** The settings page's version: two full-width choices with the languages' full names, styled like the theme choice. */
export function LangChoice() {
  const { lang, t } = useT();
  return (
    <form action={setLangAction} aria-label={t("lang.aria")} className="grid grid-cols-2 gap-2">
      {LANGS.map((l) => {
        const on = l === lang;
        return (
          <button key={l} type="submit" name="lang" value={l} aria-pressed={on} lang={l}
            className={`flex min-h-12 items-center justify-center rounded-2xl border px-3 text-sm font-bold ${on ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-muted hover:text-ink"}`}>
            {t(NAMES[l])}
          </button>
        );
      })}
    </form>
  );
}
