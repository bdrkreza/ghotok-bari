import { cookies } from "next/headers";
import { cache } from "react";
import { DEFAULT_LANG, LANG_COOKIE, isLang, makeT, type Lang, type T } from "./index";

/** The language for this request: the `lang` cookie, Bangla by default. Memoised for one render pass. */
export const getLang = cache(async (): Promise<Lang> => {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
});

/** Everything that depends on the language, for server components and actions. */
export const getT = cache(async (): Promise<T> => makeT(await getLang()));
