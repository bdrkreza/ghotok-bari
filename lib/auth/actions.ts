"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import { AppError, messageFor } from "../errors";
import { fieldValues, type FormState } from "../form";
import { createSite, getSite } from "../services/site";
import { getAuth } from "./index";
import { roleOf } from "./roles";
import { homeFor } from "./session";
import { authMessage, login, register } from "./service";

const text = (form: FormData, key: string) => String(form.get(key) ?? "");
const deps = async () => ({ auth: getAuth(), headers: await headers() });

/** A family opens an account: always a customer. */
export async function registerAction(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await getSite(getDb()))) redirect("/setup");
  const values = { name: text(form, "name"), phone: text(form, "phone") };
  const result = await register(await deps(), { ...values, password: text(form, "password") });
  if (!result.ok) return { error: authMessage(result.code), values };
  redirect("/me");
}

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { phone: text(form, "phone") };
  // "আমাকে মনে রাখুন" unticked: the session ends when the browser is closed (a shared computer)
  const remember = form.get("remember") === "on";
  const result = await login(await deps(), { ...values, password: text(form, "password"), remember });
  if (!result.ok) return { error: authMessage(result.code), values };
  // the ghotok lands on the dashboard, a family on their own page
  const role = result.userId ? await roleOf(getDb(), result.userId) : "customer";
  redirect(homeFor(role));
}

export async function logoutAction(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/login");
}

/**
 * First run: the ghotok's account and the site in one go. The account is created here; a number that already has
 * an account (an earlier deployment, or one made by hand) is accepted with its password instead, so nobody has to
 * delete anything to claim the site. Signs the ghotok in and lands on the dashboard.
 */
export async function setupAction(_prev: FormState, form: FormData): Promise<FormState> {
  const db = getDb();
  if (await getSite(db)) return { error: messageFor("site_exists") };
  const values = fieldValues(form);
  const password = text(form, "password");
  const account = { name: text(form, "ghotokName"), phone: text(form, "phone"), password };
  const d = await deps();
  let result = await register(d, account);
  if (!result.ok && result.code === "phone_taken") {
    result = await login(d, { phone: account.phone, password });
    if (!result.ok) return { error: "এই নম্বরে আগে থেকেই অ্যাকাউন্ট আছে, কিন্তু পাসওয়ার্ড মেলেনি। ওই অ্যাকাউন্টের পাসওয়ার্ড দিন, বা অন্য নম্বর।", values };
  }
  if (!result.ok) return { error: authMessage(result.code), values };
  if (!result.userId) return { error: authMessage("unknown"), values };
  try {
    await createSite(db, result.userId, values);
  } catch (e) {
    if (e instanceof AppError) return { error: messageFor(e.code), values };
    throw e;
  }
  redirect("/dashboard");
}
