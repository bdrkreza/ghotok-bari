"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import { AppError, messageFor } from "../errors";
import { fieldValues, type FormState } from "../form";
import { getLang, getT } from "../i18n/server";
import { createSite, getSite } from "../services/site";
import { getAuth } from "./index";
import { roleOf } from "./roles";
import { homeFor, requireUser } from "./session";
import { authMessage, changePassword, login, register } from "./service";

const text = (form: FormData, key: string) => String(form.get(key) ?? "");
const deps = async () => ({ auth: getAuth(), headers: await headers(), db: getDb() });

/** A family opens an account: always a customer. */
export async function registerAction(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await getSite(getDb()))) redirect("/setup");
  const values = { name: text(form, "name"), phone: text(form, "phone") };
  const result = await register(await deps(), { ...values, password: text(form, "password") });
  if (!result.ok) return { error: authMessage(result.code, await getLang()), values };
  redirect("/me");
}

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { phone: text(form, "phone") };
  // "আমাকে মনে রাখুন" unticked: the session ends when the browser is closed (a shared computer)
  const remember = form.get("remember") === "on";
  const result = await login(await deps(), { ...values, password: text(form, "password"), remember });
  if (!result.ok) return { error: authMessage(result.code, await getLang()), values };
  // the ghotok lands on the dashboard, a family on their own page
  const role = result.userId ? await roleOf(getDb(), result.userId) : "customer";
  redirect(homeFor(role));
}

/** Signing out lands on the ghotok's front page (the site's face, with its own login button), not a bare login form. */
export async function logoutAction(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/");
}

/**
 * First run: the ghotok's account and the site in one go. The account is created here; a number that already has
 * an account (an earlier deployment, or one made by hand) is accepted with its password instead, so nobody has to
 * delete anything to claim the site. Signs the ghotok in and lands on the dashboard.
 */
export async function setupAction(_prev: FormState, form: FormData): Promise<FormState> {
  const db = getDb();
  const { lang, t } = await getT();
  if (await getSite(db)) return { error: messageFor("site_exists", lang) };
  const values = fieldValues(form);
  const password = text(form, "password");
  const account = { name: text(form, "ghotokName"), phone: text(form, "phone"), password };
  const d = await deps();
  let result = await register(d, account);
  if (!result.ok && result.code === "phone_taken") {
    result = await login(d, { phone: account.phone, password });
    if (!result.ok) return { error: t("setup.existingWrongPassword"), values };
  }
  if (!result.ok) return { error: authMessage(result.code, lang), values };
  if (!result.userId) return { error: authMessage("unknown", lang), values };
  try {
    await createSite(db, result.userId, values);
  } catch (e) {
    if (e instanceof AppError) return { error: messageFor(e.code, lang), values };
    throw e;
  }
  redirect("/dashboard");
}

/** Settings: change one's own password. Other devices are signed out; this one stays in. */
export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const { lang, t } = await getT();
  const result = await changePassword(await deps(), { current: text(form, "current"), next: text(form, "next") });
  if (!result.ok) return { error: result.code === "wrong_credentials" ? t("st.wrongCurrent") : authMessage(result.code, lang) };
  return { notice: t("notice.passwordChanged") };
}
