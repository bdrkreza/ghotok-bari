import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "../db";
import { notice, profile, type NoticeKind } from "../db/schema";

// What the ghotok did that a family should hear about: their biodata listed or returned, a request turned into a
// proposal. Shown on /me until the family dismisses it. Each is scoped to the site's ghotok and to one account.

/** Leave a notice for a family account. */
export async function notify(db: Db, ghotokId: string, userId: string, kind: NoticeKind, profileId: string | null, note: string | null = null): Promise<void> {
  await db.insert(notice).values({ id: crypto.randomUUID(), ghotokId, userId, kind, profileId, note });
}

/** The family's notices they have not dismissed, newest first (up to `limit`), with the biodata number they are about. */
export async function unreadNotices(db: Db, ghotokId: string, userId: string, limit = 20) {
  return db.select({
    id: notice.id, kind: notice.kind, note: notice.note, createdAt: notice.createdAt,
    profileId: notice.profileId, profileKind: profile.kind, profileCode: profile.code, ownedBy: profile.ownerUserId,
  }).from(notice)
    .leftJoin(profile, eq(profile.id, notice.profileId))
    .where(and(eq(notice.ghotokId, ghotokId), eq(notice.userId, userId), isNull(notice.readAt)))
    .orderBy(desc(notice.createdAt))
    .limit(limit);
}

export type NoticeRow = Awaited<ReturnType<typeof unreadNotices>>[number];

/**
 * The bell's list: the family's latest notices, seen or not, newest first (up to `limit`). A seen one has `readAt`;
 * it stays here after the family has opened it or pressed "সব দেখেছি".
 */
export async function recentNotices(db: Db, ghotokId: string, userId: string, limit = 50) {
  return db.select({
    id: notice.id, kind: notice.kind, note: notice.note, createdAt: notice.createdAt, readAt: notice.readAt,
    profileId: notice.profileId, profileKind: profile.kind, profileCode: profile.code, ownedBy: profile.ownerUserId,
  }).from(notice)
    .leftJoin(profile, eq(profile.id, notice.profileId))
    .where(and(eq(notice.ghotokId, ghotokId), eq(notice.userId, userId)))
    .orderBy(desc(notice.createdAt))
    .limit(limit);
}

/** Mark one notice seen (it leaves /me, stays in the bell's list, faded), or all of them when `id` is empty. */
export async function dismissNotice(db: Db, ghotokId: string, userId: string, id = ""): Promise<void> {
  const mine = and(eq(notice.ghotokId, ghotokId), eq(notice.userId, userId), isNull(notice.readAt));
  await db.update(notice).set({ readAt: new Date() }).where(id ? and(mine, eq(notice.id, id)) : mine);
}

/** How many notices the family has not dismissed, all of them: the number on the bell. */
export async function unreadCount(db: Db, ghotokId: string, userId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(notice).where(and(eq(notice.ghotokId, ghotokId), eq(notice.userId, userId), isNull(notice.readAt)));
  return row?.n ?? 0;
}
