"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { FormState } from "../form";
import { getAuth } from "./index";
import { authMessage, login, register } from "./service";

const text = (form: FormData, key: string) => String(form.get(key) ?? "");
const deps = async () => ({ auth: getAuth(), headers: await headers() });

export async function registerAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { name: text(form, "name"), phone: text(form, "phone") };
  const result = await register(await deps(), { ...values, password: text(form, "password") });
  if (!result.ok) return { error: authMessage(result.code), values };
  redirect("/");
}

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { phone: text(form, "phone") };
  // "আমাকে মনে রাখুন" unticked: the session ends when the browser is closed (a shared computer)
  const remember = form.get("remember") === "on";
  const result = await login(await deps(), { ...values, password: text(form, "password"), remember });
  if (!result.ok) return { error: authMessage(result.code), values };
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/login");
}
