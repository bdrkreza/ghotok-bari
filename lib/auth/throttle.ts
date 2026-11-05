import { and, count, eq, gte, inArray, like, lt, not } from "drizzle-orm";
import type { Db } from "../db";
import { loginFailure } from "../db/schema";

// Slows down password guessing. Every wrong password is written down twice, under the phone number and under the
// caller's address; once either has too many in the window, sign-in is refused for that number or address until the
// oldest ones age out. A right password clears the number's record. Better Auth's own rate limit only guards its HTTP
// routes, and sign-in here goes through a server action, so the check lives in front of it (lib/auth/service.ts).

export const WINDOW_MINUTES = 15;
/** wrong passwords allowed per phone number in the window */
export const PHONE_LIMIT = 5;
/** per address: higher, since a family and a cyber café share one */
export const IP_LIMIT = 20;

const since = (now: Date) => new Date(now.getTime() - WINDOW_MINUTES * 60_000);

/** New accounts allowed per address in an hour: a cyber café or a family sharing a phone still fits, a bot does not. */
export const SIGNUP_LIMIT = 8;
export const SIGNUP_WINDOW_MINUTES = 60;
const signupSince = (now: Date) => new Date(now.getTime() - SIGNUP_WINDOW_MINUTES * 60_000);
const signupKey = (ip: string) => `signup:${ip}`;

/** The caller's address from the proxy headers, or null when there is none (tests, a direct call). */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || null;
}

const keysFor = (phone: string, ip: string | null) => [`phone:${phone}`, ...(ip ? [`ip:${ip}`] : [])];

/** True when this number, or this address, has used up its tries. */
export async function isLockedOut(db: Db, phone: string, ip: string | null, now = new Date()): Promise<boolean> {
  const rows = await db.select({ key: loginFailure.key, n: count() }).from(loginFailure)
    .where(and(inArray(loginFailure.key, keysFor(phone, ip)), gte(loginFailure.at, since(now))))
    .groupBy(loginFailure.key);
  return rows.some((r) => r.n >= (r.key.startsWith("phone:") ? PHONE_LIMIT : IP_LIMIT));
}

/** Write down one wrong password, and sweep rows that no longer count. */
export async function recordFailure(db: Db, phone: string, ip: string | null, now = new Date()): Promise<void> {
  await db.insert(loginFailure).values(keysFor(phone, ip).map((key) => ({ id: crypto.randomUUID(), key, at: now })));
  // the sign-up rows live longer than a login window; recordSignup sweeps those
  await db.delete(loginFailure).where(and(lt(loginFailure.at, since(now)), not(like(loginFailure.key, "signup:%"))));
}

/** A right password: the number starts afresh. */
export async function clearFailures(db: Db, phone: string): Promise<void> {
  await db.delete(loginFailure).where(eq(loginFailure.key, `phone:${phone}`));
}

/** True when this address has opened its share of accounts this hour. No address (tests, a direct call): never. */
export async function signupLimited(db: Db, ip: string | null, now = new Date()): Promise<boolean> {
  if (!ip) return false;
  const [row] = await db.select({ n: count() }).from(loginFailure).where(and(eq(loginFailure.key, signupKey(ip)), gte(loginFailure.at, signupSince(now))));
  return (row?.n ?? 0) >= SIGNUP_LIMIT;
}

/** Write down one sign-up attempt from this address, and sweep the ones past the hour. */
export async function recordSignup(db: Db, ip: string | null, now = new Date()): Promise<void> {
  if (!ip) return;
  await db.insert(loginFailure).values({ id: crypto.randomUUID(), key: signupKey(ip), at: now });
  await db.delete(loginFailure).where(and(like(loginFailure.key, "signup:%"), lt(loginFailure.at, signupSince(now))));
}
