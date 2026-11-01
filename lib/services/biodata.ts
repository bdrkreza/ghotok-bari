import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../db";
import { profile, type Profile } from "../db/schema";
import { AppError } from "../errors";
import { createProfile, findSame, parseProfile, profileWhere, type ProfileFilter } from "./profiles";
import { FAMILY_VIEW } from "./share";

// A family's side of biodata. Their own entries are scoped twice: to the site's ghotok and to their account
// (owner_user_id). What they see of anyone else goes through FAMILY_VIEW (share.ts): approved people, no names.

const mine = (ghotokId: string, ownerUserId: string) => and(eq(profile.ghotokId, ghotokId), eq(profile.ownerUserId, ownerUserId));

/** Every biodata this family has handed in, newest first, whatever the ghotok has decided about it. */
export async function myBiodata(db: Db, ghotokId: string, ownerUserId: string): Promise<Profile[]> {
  return db.select().from(profile).where(mine(ghotokId, ownerUserId)).orderBy(desc(profile.updatedAt));
}

/** One of the family's own biodata, in full, or AppError("not_found"): someone else's is never theirs to read. */
export async function getMyBiodata(db: Db, ghotokId: string, ownerUserId: string, id: string): Promise<Profile> {
  const row = await db.query.profile.findFirst({ where: and(eq(profile.id, id), mine(ghotokId, ownerUserId)) });
  if (!row) throw new AppError("not_found");
  return row;
}

/** The family must tick "my guardian knows, and all of this is true" (the form's `pledge` box) each time they hand in. */
const pledged = (raw: Record<string, string>): Date => {
  if (raw.pledge !== "on") throw new AppError("pledge_required", undefined, { pledge: { code: "pledge" } });
  return new Date();
};

/**
 * A family hands each person in once: the same kind, name and birth year from the same account is the same person,
 * so a second one is refused with AppError("biodata_exists") pointing at the first, which they edit instead. A
 * son's and a daughter's, or two sisters', are different people and go in as usual.
 */
async function handedInBefore(db: Db, ghotokId: string, ownerUserId: string, data: ReturnType<typeof parseProfile>, exceptId?: string) {
  const same = await findSame(db, ghotokId, { kind: data.kind, name: data.name, birthYear: data.birthYear, ownerUserId, exceptId });
  if (same) throw new AppError("biodata_exists", undefined, undefined, same);
}

/** Hand in a biodata: it waits for the ghotok as "pending". The ghotok's notes field is not the family's to write. */
export async function submitBiodata(db: Db, ghotokId: string, ownerUserId: string, raw: Record<string, string>): Promise<string> {
  const pledgedAt = pledged(raw);
  await handedInBefore(db, ghotokId, ownerUserId, parseProfile({ ...raw, notes: "" }));
  return createProfile(db, ghotokId, { ...raw, notes: "" }, { ownerUserId, pledgedAt });
}

/** Change one's own biodata. Whatever the ghotok had decided, the new text waits for approval again. */
export async function updateMyBiodata(db: Db, ghotokId: string, ownerUserId: string, id: string, raw: Record<string, string>): Promise<void> {
  const existing = await getMyBiodata(db, ghotokId, ownerUserId, id);
  const pledgedAt = pledged(raw);
  const data = parseProfile({ ...raw, kind: existing.kind, notes: existing.notes ?? "" });
  await handedInBefore(db, ghotokId, ownerUserId, data, id);
  await db.update(profile).set({ ...data, pledgedAt, approval: "pending", returnNote: null, approvedAt: null })
    .where(and(eq(profile.id, id), mine(ghotokId, ownerUserId)));
}

/** A family may take back a biodata the ghotok has not listed; a listed one is removed by the ghotok (AppError("ask_ghotok")). */
export async function deleteMyBiodata(db: Db, ghotokId: string, ownerUserId: string, id: string): Promise<void> {
  const existing = await getMyBiodata(db, ghotokId, ownerUserId, id);
  if (existing.approval === "approved") throw new AppError("ask_ghotok");
  await db.delete(profile).where(and(eq(profile.id, id), mine(ghotokId, ownerUserId)));
}

export type BrowseFilter = Omit<ProfileFilter, "status" | "approval" | "placesOnly" | "incomeMin">;

/** What a family sees in /patro and /patri: approved people still looking, the family's columns only; `q` matches places. */
export async function browseBiodata(db: Db, ghotokId: string, filter: BrowseFilter) {
  return db.select({ id: profile.id, ...FAMILY_VIEW }).from(profile)
    .where(profileWhere(ghotokId, { ...filter, status: "active", approval: "approved", placesOnly: true }))
    .orderBy(desc(profile.updatedAt));
}

export type FamilyBiodata = Awaited<ReturnType<typeof browseBiodata>>[number];

/** The latest listed people of both kinds, as a family sees them, for the family's home page. */
export async function recentBiodata(db: Db, ghotokId: string, limit = 4): Promise<FamilyBiodata[]> {
  return db.select({ id: profile.id, ...FAMILY_VIEW }).from(profile)
    .where(and(eq(profile.ghotokId, ghotokId), eq(profile.approval, "approved"), eq(profile.status, "active")))
    .orderBy(desc(profile.updatedAt)).limit(limit);
}

/** One approved biodata as a family sees it, or null. */
export async function browseOne(db: Db, ghotokId: string, id: string): Promise<FamilyBiodata | null> {
  const [row] = await db.select({ id: profile.id, ...FAMILY_VIEW }).from(profile)
    .where(and(eq(profile.id, id), eq(profile.ghotokId, ghotokId), eq(profile.approval, "approved"))).limit(1);
  return row ?? null;
}
