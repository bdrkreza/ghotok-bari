import { and, count, countDistinct, desc, eq, gt, sql } from "drizzle-orm";
import type { Db } from "../db";
import { favorite, interest, profile, profileEvent, user, type ProfileEventKind } from "../db/schema";

// Who looked at which biodata. A family's views, short-list picks and requests are written as they happen (the biodata
// page, `toggleFavorite`, `expressInterest`). The ghotok reads them with names (the user table for the family's name:
// only accounts that looked on this ghotok's site, scoped by profile_event.ghotok_id); a biodata's own family reads
// counts only, never who.

/** The same account opening the same biodata again within this long is not a new view. */
const VIEW_WINDOW_MINUTES = 30;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Write one event. Only approved biodata of this ghotok count, and never a family looking at its own. Never throws:
 * a log line must not break the page or the action that wrote it.
 */
export async function recordProfileEvent(db: Db, ghotokId: string, userId: string, profileId: string, kind: ProfileEventKind): Promise<void> {
  try {
    const [row] = await db.select({ owner: profile.ownerUserId }).from(profile)
      .where(and(eq(profile.id, profileId), eq(profile.ghotokId, ghotokId), eq(profile.approval, "approved")));
    if (!row || row.owner === userId) return;
    if (kind === "view") {
      const since = new Date(Date.now() - VIEW_WINDOW_MINUTES * 60 * 1000);
      const [recent] = await db.select({ id: profileEvent.id }).from(profileEvent).where(and(
        eq(profileEvent.userId, userId), eq(profileEvent.profileId, profileId), eq(profileEvent.kind, "view"), gt(profileEvent.createdAt, since),
      )).limit(1);
      if (recent) return;
    }
    await db.insert(profileEvent).values({ id: crypto.randomUUID(), ghotokId, userId, profileId, kind });
  } catch (e) {
    console.error("[views] could not record:", e instanceof Error ? e.message : e);
  }
}

/** The ghotok's log: the latest events, newest first, with who and which biodata. */
export async function listProfileEvents(db: Db, ghotokId: string, limit = 300) {
  return db.select({
    id: profileEvent.id, kind: profileEvent.kind, createdAt: profileEvent.createdAt,
    userId: profileEvent.userId, who: user.name,
    profileId: profile.id, profileKind: profile.kind, code: profile.code, name: profile.name,
  }).from(profileEvent)
    .innerJoin(profile, eq(profile.id, profileEvent.profileId))
    .leftJoin(user, eq(user.id, profileEvent.userId))
    .where(eq(profileEvent.ghotokId, ghotokId))
    .orderBy(desc(profileEvent.createdAt))
    .limit(limit);
}

export type ProfileEventRow = Awaited<ReturnType<typeof listProfileEvents>>[number];

/** The last seven days in numbers, for the top of the ghotok's log. */
export async function weekEventCounts(db: Db, ghotokId: string): Promise<Record<ProfileEventKind, number>> {
  const rows = await db.select({ kind: profileEvent.kind, n: count() }).from(profileEvent)
    .where(and(eq(profileEvent.ghotokId, ghotokId), gt(profileEvent.createdAt, new Date(Date.now() - WEEK_MS))))
    .groupBy(profileEvent.kind);
  const out: Record<ProfileEventKind, number> = { view: 0, favorite: 0, interest: 0 };
  for (const r of rows) out[r.kind] = r.n;
  return out;
}

/**
 * How one of the family's own biodata is doing, as numbers only: times it was opened (and by how many families), and how
 * many families have it on their short list or asked about it right now. AppError-free: someone else's biodata gives zeros.
 */
export async function myBiodataStats(db: Db, ghotokId: string, ownerUserId: string, profileId: string) {
  const [own] = await db.select({ id: profile.id }).from(profile)
    .where(and(eq(profile.id, profileId), eq(profile.ghotokId, ghotokId), eq(profile.ownerUserId, ownerUserId)));
  if (!own) return { views: 0, viewsWeek: 0, families: 0, favorites: 0, interests: 0 };
  const week = new Date(Date.now() - WEEK_MS);
  const [[v], [fav], [int]] = await Promise.all([
    db.select({
      views: count(), families: countDistinct(profileEvent.userId),
      viewsWeek: sql<number>`count(*) filter (where ${profileEvent.createdAt} > ${week})::int`,
    }).from(profileEvent).where(and(eq(profileEvent.profileId, profileId), eq(profileEvent.ghotokId, ghotokId), eq(profileEvent.kind, "view"))),
    db.select({ n: count() }).from(favorite).where(and(eq(favorite.profileId, profileId), eq(favorite.ghotokId, ghotokId))),
    db.select({ n: count() }).from(interest).where(and(eq(interest.profileId, profileId), eq(interest.ghotokId, ghotokId))),
  ]);
  return { views: v.views, viewsWeek: v.viewsWeek, families: v.families, favorites: fav.n, interests: int.n };
}
