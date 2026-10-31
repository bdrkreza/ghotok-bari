"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LANG, makeT, type Lang, type T } from "./index";

const LangContext = createContext<Lang>(DEFAULT_LANG);

/** Mounted once in the root layout with the request's language, so client components can read it. */
export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** Everything that depends on the language, for client components. */
export function useT(): T {
  const lang = useContext(LangContext);
  return useMemo(() => makeT(lang), [lang]);
}
