import { and, count, eq, gte, inArray, lt } from "drizzle-orm";
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
  await db.delete(loginFailure).where(lt(loginFailure.at, since(now)));
}

/** A right password: the number starts afresh. */
export async function clearFailures(db: Db, phone: string): Promise<void> {
  await db.delete(loginFailure).where(eq(loginFailure.key, `phone:${phone}`));
}
