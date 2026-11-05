import { APIError } from "better-auth/api";
import { z } from "zod";
import type { Db } from "../db";
import type { Auth } from "./index";
import { clearFailures, clientIp, isLockedOut, recordFailure, recordSignup, signupLimited } from "./throttle";
import { makeT, type Lang } from "../i18n";
import { MIN_PASSWORD_LENGTH, normalizePhone, placeholderEmail } from "./phone";

export type AuthErrorCode =
  | "invalid_name"
  | "invalid_phone"
  | "weak_password"
  | "phone_taken"
  | "wrong_credentials"
  | "too_many"
  | "too_many_signups"
  | "unknown";

export type AuthResult = { ok: true; userId?: string } | { ok: false; code: AuthErrorCode };

const fail = (code: AuthErrorCode): AuthResult => ({ ok: false, code });

const password = z.string().min(MIN_PASSWORD_LENGTH).max(128);
const name = z.string().trim().min(2).max(60);

export interface Deps {
  auth: Auth;
  /** request headers; lets Better Auth read and (with nextCookies) set the session cookie */
  headers: Headers;
  /** where wrong passwords are counted (lib/auth/throttle.ts); without it sign-in is not throttled */
  db?: Db;
}

const errorCode = (e: unknown): string =>
  e instanceof APIError ? String((e.body as { code?: string } | undefined)?.code ?? e.status) : "";

export async function register(deps: Deps, input: { name: string; phone: string; password: string }): Promise<AuthResult> {
  const parsedName = name.safeParse(input.name);
  if (!parsedName.success) return fail("invalid_name");
  const phone = normalizePhone(input.phone);
  if (!phone) return fail("invalid_phone");
  if (!password.safeParse(input.password).success) return fail("weak_password");

  // a bot opening accounts by the hundred: a few per address per hour (lib/auth/throttle.ts)
  const ip = clientIp(deps.headers);
  if (deps.db && (await signupLimited(deps.db, ip))) return fail("too_many_signups");
  if (deps.db) await recordSignup(deps.db, ip);

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
  const ip = clientIp(deps.headers);
  if (deps.db && (await isLockedOut(deps.db, phone, ip))) return fail("too_many");
  try {
    const res = await deps.auth.api.signInUsername({ body: { username: phone, password: input.password, rememberMe: input.remember ?? true }, headers: deps.headers });
    if (deps.db) await clearFailures(deps.db, phone);
    return { ok: true, userId: (res as { user?: { id: string } } | null)?.user?.id };
  } catch (e) {
    if (e instanceof APIError) {
      if (deps.db) await recordFailure(deps.db, phone, ip);
      return fail("wrong_credentials");
    }
    console.error("login failed", e);
    return fail("unknown");
  }
}

/** Change one's own password, knowing the current one. Every other session of the account is signed out. */
export async function changePassword(deps: Deps, input: { current: string; next: string }): Promise<AuthResult> {
  if (!password.safeParse(input.next).success) return fail("weak_password");
  try {
    await deps.auth.api.changePassword({ body: { currentPassword: input.current, newPassword: input.next, revokeOtherSessions: true }, headers: deps.headers });
    return { ok: true };
  } catch (e) {
    if (e instanceof APIError) return fail("wrong_credentials");
    console.error("change password failed", e);
    return fail("unknown");
  }
}

/** What to tell the user for each error code, in their language. Raw errors are never shown. */
export function authMessage(code: AuthErrorCode, lang: Lang = "bn"): string {
  return makeT(lang).t(`autherr.${code}`, { n: MIN_PASSWORD_LENGTH });
}
