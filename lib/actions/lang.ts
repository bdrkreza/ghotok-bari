"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { LANG_COOKIE, isLang } from "../i18n";

/** The language switch: remembers the choice in a cookie for a year and re-renders the page in that language. */
export async function setLangAction(form: FormData): Promise<void> {
  const lang = form.get("lang");
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
