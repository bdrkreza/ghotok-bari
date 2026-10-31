"use client";

import { setLangAction } from "@/lib/actions/lang";
import { useT } from "@/lib/i18n/client";
import { LANGS } from "@/lib/i18n";

/** "বাং | EN": one tap switches the whole site's language. Works without JavaScript too, since it is a plain form. */
export function LangSwitch({ className = "" }: { className?: string }) {
  const { lang, t } = useT();
  return (
    <form action={setLangAction} aria-label={t("lang.aria")} className={`inline-flex rounded-full border border-line bg-surface p-0.5 ${className}`}>
      {LANGS.map((l) => (
        <button key={l} type="submit" name="lang" value={l} aria-pressed={l === lang} lang={l}
          className={`min-h-9 rounded-full px-2.5 text-xs font-bold ${l === lang ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>
          {l === "bn" ? "বাং" : "EN"}
        </button>
      ))}
    </form>
  );
}
