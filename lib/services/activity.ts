import { desc, eq } from "drizzle-orm";
import type { Db } from "../db";
import { activity, user } from "../db/schema";

// Who on the ghotok's side did what. Written by the ghotok's actions after a change succeeds (the services stay
// unaware of who is signed in), read on /dashboard/activity. The actor's name comes from the user table: only
// accounts that acted on this ghotok's site, scoped by activity.ghotok_id.

/** Every action that is logged; each has a phrase "act.<action>" in the dictionary. */
export type ActivityAction =
  | "profileAdded" | "profileEdited" | "profileDeleted" | "profileStatus" | "listed" | "returned" | "visibility"
  | "shareOn" | "shareOff"
  | "proposalAdded" | "proposalStatus" | "proposalNote" | "proposalDeleted" | "followUp" | "interestProposed" | "interestClosed"
  | "ledgerAdded" | "ledgerDeleted"
  | "roleChanged" | "passwordReset" | "siteEdited" | "backup";

export async function logActivity(db: Db, ghotokId: string, actorId: string, action: ActivityAction, label: string | null = null, href: string | null = null): Promise<void> {
  await db.insert(activity).values({ id: crypto.randomUUID(), ghotokId, actorId, action, label, href });
}

/** The latest actions, newest first, with who did each. */
export async function listActivity(db: Db, ghotokId: string, limit = 200) {
  return db.select({
    id: activity.id, action: activity.action, label: activity.label, href: activity.href, createdAt: activity.createdAt,
    actorId: activity.actorId, actor: user.name,
  }).from(activity)
    .leftJoin(user, eq(user.id, activity.actorId))
    .where(eq(activity.ghotokId, ghotokId))
    .orderBy(desc(activity.createdAt))
    .limit(limit);
}

export type ActivityRow = Awaited<ReturnType<typeof listActivity>>[number];
