import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "../db";
import { notice, profile, type NoticeKind } from "../db/schema";

// What the ghotok did that a family should hear about: their biodata listed or returned, a request turned into a
// proposal. Shown on /me until the family dismisses it. Each is scoped to the site's ghotok and to one account.

/** Leave a notice for a family account. */
export async function notify(db: Db, ghotokId: string, userId: string, kind: NoticeKind, profileId: string | null, note: string | null = null): Promise<void> {
  await db.insert(notice).values({ id: crypto.randomUUID(), ghotokId, userId, kind, profileId, note });
}

/** The family's notices they have not dismissed, newest first, with the biodata number they are about. */
export async function unreadNotices(db: Db, ghotokId: string, userId: string) {
  return db.select({
    id: notice.id, kind: notice.kind, note: notice.note, createdAt: notice.createdAt,
    profileId: notice.profileId, profileKind: profile.kind, profileCode: profile.code, ownedBy: profile.ownerUserId,
  }).from(notice)
    .leftJoin(profile, eq(profile.id, notice.profileId))
    .where(and(eq(notice.ghotokId, ghotokId), eq(notice.userId, userId), isNull(notice.readAt)))
    .orderBy(desc(notice.createdAt))
    .limit(20);
}

export type NoticeRow = Awaited<ReturnType<typeof unreadNotices>>[number];

/** Dismiss one notice, or all of them when `id` is empty. */
export async function dismissNotice(db: Db, ghotokId: string, userId: string, id = ""): Promise<void> {
  const mine = and(eq(notice.ghotokId, ghotokId), eq(notice.userId, userId), isNull(notice.readAt));
  await db.update(notice).set({ readAt: new Date() }).where(id ? and(mine, eq(notice.id, id)) : mine);
}
