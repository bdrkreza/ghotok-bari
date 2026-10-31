"use client";

import { setLangAction } from "@/lib/actions/lang";
import { useT } from "@/lib/i18n/client";
import { LANGS } from "@/lib/i18n";

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
