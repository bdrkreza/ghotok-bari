import { and, eq, inArray, or, sql } from "drizzle-orm";
import { adminPhones } from "../auth/roles";
import type { Db } from "../db";
import { pushSubscription, user } from "../db/schema";
import { sendEmptyPush, vapidKeys } from "../push";

// The browsers that asked for news while the site is closed, one row per browser, scoped to the ghotok's site and
// to the account that turned it on (settings). pushToAdmins joins the user table to find the ghotok's side: only
// accounts that subscribed on this site, scoped by push_subscription.ghotok_id.

/** Keep a browser's push address for this account; the same browser signing in as someone else moves to them. */
export async function savePushSubscription(db: Db, ghotokId: string, userId: string, endpoint: string): Promise<void> {
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 2000) return;
  await db.insert(pushSubscription).values({ id: crypto.randomUUID(), ghotokId, userId, endpoint })
    .onConflictDoUpdate({ target: pushSubscription.endpoint, set: { ghotokId, userId } });
}

/** Forget a browser (turned off in settings, or signed out of). */
export async function removePushSubscription(db: Db, ghotokId: string, userId: string, endpoint: string): Promise<void> {
  await db.delete(pushSubscription).where(and(eq(pushSubscription.ghotokId, ghotokId), eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, endpoint)));
}

/** Whether this account has push on in any browser. */
export async function hasPush(db: Db, ghotokId: string, userId: string): Promise<boolean> {
  const [row] = await db.select({ id: pushSubscription.id }).from(pushSubscription)
    .where(and(eq(pushSubscription.ghotokId, ghotokId), eq(pushSubscription.userId, userId))).limit(1);
  return Boolean(row);
}

async function wake(db: Db, rows: { id: string; endpoint: string }[]): Promise<void> {
  const keys = vapidKeys();
  if (!keys || !rows.length) return;
  await Promise.all(rows.map(async (r) => {
    if ((await sendEmptyPush(r.endpoint, keys)) === "gone") await db.delete(pushSubscription).where(eq(pushSubscription.id, r.id));
  }));
}

/** Wake every browser these accounts turned push on in. Never throws: news that cannot be pushed waits in the bell. */
export async function pushTo(db: Db, ghotokId: string, userIds: string[]): Promise<void> {
  if (!userIds.length) return;
  try {
    await wake(db, await db.select({ id: pushSubscription.id, endpoint: pushSubscription.endpoint }).from(pushSubscription)
      .where(and(eq(pushSubscription.ghotokId, ghotokId), inArray(pushSubscription.userId, userIds))));
  } catch {
    /* the bell still has it */
  }
}

/** Wake the ghotok's side: the owner, admins, and the numbers in ADMIN_PHONES (lib/auth/roles.ts). */
export async function pushToAdmins(db: Db, ghotokId: string): Promise<void> {
  const phones = adminPhones();
  try {
    await wake(db, await db.select({ id: pushSubscription.id, endpoint: pushSubscription.endpoint }).from(pushSubscription)
      .innerJoin(user, eq(user.id, pushSubscription.userId))
      .where(and(eq(pushSubscription.ghotokId, ghotokId), or(
        eq(user.id, ghotokId), eq(user.role, "admin"), phones.length ? inArray(user.username, phones) : sql`false`,
      ))));
  } catch {
    /* the bell still has it */
  }
}
