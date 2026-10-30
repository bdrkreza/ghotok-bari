import { APIError } from "better-auth/api";
import { z } from "zod";
import type { Auth } from "./index";
import { bn } from "../bn";
import { MIN_PASSWORD_LENGTH, normalizePhone, placeholderEmail } from "./phone";

export type AuthErrorCode =
  | "invalid_name"
  | "invalid_phone"
  | "weak_password"
  | "phone_taken"
  | "wrong_credentials"
  | "unknown";

export type AuthResult = { ok: true; userId?: string } | { ok: false; code: AuthErrorCode };

const fail = (code: AuthErrorCode): AuthResult => ({ ok: false, code });

const password = z.string().min(MIN_PASSWORD_LENGTH).max(128);
const name = z.string().trim().min(2).max(60);

export interface Deps {
  auth: Auth;
  /** request headers; lets Better Auth read and (with nextCookies) set the session cookie */
  headers: Headers;
}

const errorCode = (e: unknown): string =>
  e instanceof APIError ? String((e.body as { code?: string } | undefined)?.code ?? e.status) : "";

export async function register(deps: Deps, input: { name: string; phone: string; password: string }): Promise<AuthResult> {
  const parsedName = name.safeParse(input.name);
  if (!parsedName.success) return fail("invalid_name");
  const phone = normalizePhone(input.phone);
  if (!phone) return fail("invalid_phone");
  if (!password.safeParse(input.password).success) return fail("weak_password");

  try {
    const res = await deps.auth.api.signUpEmail({
      body: { name: parsedName.data, email: placeholderEmail(phone), password: input.password, username: phone },
      headers: deps.headers,
    });
    return { ok: true, userId: (res as { user?: { id: string } } | null)?.user?.id };
  } catch (e) {
    const code = errorCode(e);
    if (/USERNAME|USER_ALREADY_EXISTS|EMAIL/.test(code)) return fail("phone_taken");
    if (/PASSWORD/.test(code)) return fail("weak_password");
    console.error("register failed", e);
    return fail("unknown");
  }
}

/** `remember: false` gives a one-day session and a cookie that goes when the browser closes; the default is the long session set in createAuth. */
export async function login(deps: Deps, input: { phone: string; password: string; remember?: boolean }): Promise<AuthResult> {
  const phone = normalizePhone(input.phone);
  // Same answer for a malformed number, an unknown number and a wrong password:
  // the response never reveals whether an account exists.
  if (!phone || !input.password) return fail("wrong_credentials");
  try {
    const res = await deps.auth.api.signInUsername({ body: { username: phone, password: input.password, rememberMe: input.remember ?? true }, headers: deps.headers });
    return { ok: true, userId: (res as { user?: { id: string } } | null)?.user?.id };
  } catch (e) {
    if (e instanceof APIError) return fail("wrong_credentials");
    console.error("login failed", e);
    return fail("unknown");
  }
}

/** What to tell the user for each error code. Raw errors are never shown. */
export function authMessage(code: AuthErrorCode): string {
  switch (code) {
    case "invalid_name": return "নাম কমপক্ষে ২ অক্ষরের হতে হবে।";
    case "invalid_phone": return "সঠিক মোবাইল নম্বর দিন, যেমন 01712345678।";
    case "weak_password": return `পাসওয়ার্ড কমপক্ষে ${bn(MIN_PASSWORD_LENGTH)} অক্ষরের হতে হবে।`;
    case "phone_taken": return "এই নম্বরে আগে থেকেই অ্যাকাউন্ট আছে। লগইন করুন।";
    case "wrong_credentials": return "মোবাইল নম্বর বা পাসওয়ার্ড ঠিক নয়।";
    default: return "কিছু একটা সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।";
  }
}
