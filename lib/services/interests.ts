import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../db";
import { favorite, interest, profile, proposal, type InterestStatus } from "../db/schema";
import { AppError } from "../errors";
import { notify } from "./notices";
import { createProposal } from "./proposals";
import { FAMILY_VIEW } from "./share";

// What a family does with someone else's biodata: "আগ্রহ জানান" (a request that lands in the ghotok's inbox) and the
// short list ("পছন্দের তালিকা", private to the family). Both only ever point at approved, listed biodata, and what the
// family reads back goes through FAMILY_VIEW. The ghotok's inbox joins the user table for the asking family's name and
// number: only accounts that asked on this ghotok's site, scoped by interest.ghotok_id.

/** An approved biodata still looking, or AppError("not_found"). */
async function listed(db: Db, ghotokId: string, id: string) {
  const [row] = await db.select({ id: profile.id, kind: profile.kind }).from(profile)
    .where(and(eq(profile.id, id), eq(profile.ghotokId, ghotokId), eq(profile.approval, "approved"), eq(profile.status, "active")));
  if (!row) throw new AppError("not_found");
  return row;
}

/**
 * The family asks the ghotok about a biodata. `forProfileId`, when given, must be one of the family's own listed
 * biodata of the other kind. Asking again changes the note and wakes a closed request.
 */
export async function expressInterest(db: Db, ghotokId: string, userId: string, input: { profileId: string; forProfileId?: string; note?: string }): Promise<void> {
  const liked = await listed(db, ghotokId, input.profileId);
  let forProfileId: string | null = null;
  if (input.forProfileId) {
    const [own] = await db.select({ id: profile.id, kind: profile.kind }).from(profile).where(and(
      eq(profile.id, input.forProfileId), eq(profile.ghotokId, ghotokId), eq(profile.ownerUserId, userId), eq(profile.approval, "approved"),
    ));
    if (!own || own.kind === liked.kind) throw new AppError("invalid_input");
    forProfileId = own.id;
  }
  const note = input.note?.trim().slice(0, 500) || null;
  await db.insert(interest).values({ id: crypto.randomUUID(), ghotokId, userId, profileId: liked.id, forProfileId, note })
    .onConflictDoUpdate({ target: [interest.userId, interest.profileId], set: { forProfileId, note, status: "new" }, where: sql`${interest.status} <> 'proposed'` });
}

/** The family takes a request back, while the ghotok has not acted on it. */
export async function withdrawInterest(db: Db, ghotokId: string, userId: string, profileId: string): Promise<void> {
  await db.delete(interest).where(and(eq(interest.ghotokId, ghotokId), eq(interest.userId, userId), eq(interest.profileId, profileId), eq(interest.status, "new")));
}

/** This family's request about one biodata, or null. */
export async function myInterestIn(db: Db, ghotokId: string, userId: string, profileId: string) {
  const [row] = await db.select({ status: interest.status, note: interest.note, createdAt: interest.createdAt }).from(interest)
    .where(and(eq(interest.ghotokId, ghotokId), eq(interest.userId, userId), eq(interest.profileId, profileId)));
  return row ?? null;
}

/** Every request this family has made, newest first, with the biodata as a family sees it. */
export async function myInterests(db: Db, ghotokId: string, userId: string) {
  return db.select({ status: interest.status, createdAt: interest.createdAt, b: { id: profile.id, ...FAMILY_VIEW } }).from(interest)
    .innerJoin(profile, eq(profile.id, interest.profileId))
    .where(and(eq(interest.ghotokId, ghotokId), eq(interest.userId, userId), eq(profile.approval, "approved")))
    .orderBy(desc(interest.createdAt));
}

/** The ghotok's inbox: requests in one state, newest first, with who asked, about whom, and for whom. */
export async function listInterests(db: Db, ghotokId: string, status: InterestStatus = "new") {
  return db.query.interest.findMany({
    where: and(eq(interest.ghotokId, ghotokId), eq(interest.status, status)),
    with: {
      profile: { columns: { id: true, kind: true, code: true, name: true, district: true } },
      forProfile: { columns: { id: true, kind: true, code: true, name: true, district: true, approval: true } },
      user: { columns: { name: true, username: true } },
    },
    orderBy: [desc(interest.createdAt)],
  });
}

export type InterestRow = Awaited<ReturnType<typeof listInterests>>[number];

export async function newInterestCount(db: Db, ghotokId: string): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(interest).where(and(eq(interest.ghotokId, ghotokId), eq(interest.status, "new")));
  return row?.n ?? 0;
}

async function getInterest(db: Db, ghotokId: string, id: string) {
  const row = await db.query.interest.findFirst({ where: and(eq(interest.id, id), eq(interest.ghotokId, ghotokId)) });
  if (!row) throw new AppError("not_found");
  return row;
}

/**
 * Turn a request into a proposal between the liked biodata and the family's own. When that pair is already proposed,
 * the request is tied to the existing proposal instead. Returns the proposal's id.
 */
export async function proposeFromInterest(db: Db, ghotokId: string, id: string): Promise<string> {
  const row = await getInterest(db, ghotokId, id);
  if (!row.forProfileId) throw new AppError("invalid_input");
  const [a, b] = await db.select({ id: profile.id, kind: profile.kind }).from(profile)
    .where(and(eq(profile.ghotokId, ghotokId), inArray(profile.id, [row.profileId, row.forProfileId])));
  if (!a || !b) throw new AppError("not_found");
  const patroId = a.kind === "patro" ? a.id : b.id;
  const patriId = a.kind === "patri" ? a.id : b.id;
  let proposalId: string;
  const existing = await db.query.proposal.findFirst({ where: and(eq(proposal.patroId, patroId), eq(proposal.patriId, patriId), eq(proposal.ghotokId, ghotokId)) });
  if (existing) proposalId = existing.id;
  else proposalId = await createProposal(db, ghotokId, { patroId, patriId, note: row.note ?? "" });
  await db.update(interest).set({ status: "proposed", proposalId }).where(eq(interest.id, id));
  await notify(db, ghotokId, row.userId, "proposed", row.profileId);
  return proposalId;
}

/** Mark a request handled without a proposal here (the ghotok called, or it did not suit), or open it again. */
export async function setInterestStatus(db: Db, ghotokId: string, id: string, status: "new" | "closed"): Promise<void> {
  await getInterest(db, ghotokId, id);
  await db.update(interest).set({ status }).where(and(eq(interest.id, id), eq(interest.ghotokId, ghotokId)));
}

/* ---------- the short list ---------- */

/** Put a listed biodata on the family's short list, or take it off. Returns whether it is on the list now. */
export async function toggleFavorite(db: Db, ghotokId: string, userId: string, profileId: string): Promise<boolean> {
  const gone = await db.delete(favorite).where(and(eq(favorite.userId, userId), eq(favorite.profileId, profileId), eq(favorite.ghotokId, ghotokId)))
    .returning({ id: favorite.profileId });
  if (gone.length) return false;
  await listed(db, ghotokId, profileId);
  await db.insert(favorite).values({ ghotokId, userId, profileId }).onConflictDoNothing();
  return true;
}

export async function isFavorite(db: Db, ghotokId: string, userId: string, profileId: string): Promise<boolean> {
  const [row] = await db.select({ id: favorite.profileId }).from(favorite)
    .where(and(eq(favorite.ghotokId, ghotokId), eq(favorite.userId, userId), eq(favorite.profileId, profileId)));
  return Boolean(row);
}

/** The family's short list, most recently added first; biodata no longer listed drop out. */
export async function myFavorites(db: Db, ghotokId: string, userId: string) {
  return db.select({ id: profile.id, ...FAMILY_VIEW }).from(favorite)
    .innerJoin(profile, eq(profile.id, favorite.profileId))
    .where(and(eq(favorite.ghotokId, ghotokId), eq(favorite.userId, userId), eq(profile.approval, "approved")))
    .orderBy(desc(favorite.createdAt));
}

/** The family behind a request: name and number, for the ghotok to call. */
export const asker = (row: Pick<InterestRow, "user">) => ({ name: row.user.name, phone: row.user.username ?? "" });
