import { and, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db";
import { profile, type MaritalStatus, type Profile, type ProfileKind, type ProfileStatus, type Religion } from "../db/schema";
import { AppError } from "../errors";
import { normalizePhone } from "../auth/phone";
import type { Place } from "../search";
import { currentYear } from "../time";

// Legal minimum ages in Bangladesh (Child Marriage Restraint Act 2017): groom 21, bride 18.
export const MIN_AGE: Record<ProfileKind, number> = { patro: 21, patri: 18 };

const optional = (max: number) => z.string().trim().max(max).transform((s) => s || null);
/** "" -> null, otherwise a whole number in range; Bangla digits are accepted */
const optionalInt = (min: number, max: number) =>
  z.string().trim().transform((s, ctx) => {
    if (!s) return null;
    const n = Number(s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))));
    if (!Number.isInteger(n) || n < min || n > max) { ctx.addIssue({ code: "custom", message: "range" }); return null; }
    return n;
  });

const profileInput = z.object({
  kind: z.enum(["patro", "patri"]),
  name: z.string().trim().min(2).max(80),
  fatherName: optional(80),
  motherName: optional(80),
  birthYear: optionalInt(1900, 2100).refine((n): n is number => n !== null),
  heightCm: optionalInt(100, 250),
  religion: z.enum(["islam", "hindu", "christian", "buddhist", "other"]),
  maritalStatus: z.enum(["obibahito", "talakprapto", "bidhoba"]),
  education: optional(120),
  profession: optional(120),
  monthlyIncome: optionalInt(0, 100_000_000),
  village: optional(80),
  upazila: optional(80),
  district: z.string().trim().min(2).max(80),
  guardianName: optional(80),
  guardianPhone: z.string().trim().transform((s, ctx) => {
    if (!s) return null;
    const phone = normalizePhone(s);
    if (!phone) ctx.addIssue({ code: "custom", message: "phone" });
    return phone;
  }),
  familyDetails: optional(2000),
  expectations: optional(2000),
  photoUrl: z.union([z.url().max(500), z.literal("")]).transform((s) => s || null),
  notes: optional(2000),
});

/** Every field the form may send; a missing one is read as empty. */
const FIELDS = Object.keys(profileInput.shape);

/** Raw form fields -> a validated row body. Throws AppError with a Bangla-ready code. */
export function parseProfile(raw: Record<string, string>) {
  const filled = Object.fromEntries(FIELDS.map((k) => [k, raw[k] ?? ""]));
  const parsed = profileInput.safeParse(filled);
  if (!parsed.success) throw new AppError("invalid_input", parsed.error.message);
  const data = parsed.data;
  const age = currentYear() - data.birthYear;
  if (age < MIN_AGE[data.kind]) throw new AppError(data.kind === "patro" ? "patro_too_young" : "patri_too_young");
  return data;
}

export async function createProfile(db: Db, ghotokId: string, raw: Record<string, string>): Promise<string> {
  const data = parseProfile(raw);
  const id = crypto.randomUUID();
  // the next biodata number for this ghotok and kind. A ghotok adds people one at a time; should two inserts ever
  // race, the unique index (ghotok, kind, code) makes one fail instead of handing out the same number twice.
  const [{ next }] = await db.select({ next: sql<number>`coalesce(max(${profile.code}), 0)::int + 1` }).from(profile)
    .where(and(eq(profile.ghotokId, ghotokId), eq(profile.kind, data.kind)));
  await db.insert(profile).values({ id, ghotokId, code: next, ...data });
  return id;
}

export async function updateProfile(db: Db, ghotokId: string, id: string, raw: Record<string, string>): Promise<void> {
  const existing = await getProfile(db, ghotokId, id);
  const data = parseProfile({ ...raw, kind: existing.kind });
  await db.update(profile).set(data).where(and(eq(profile.id, id), eq(profile.ghotokId, ghotokId)));
}

export async function setProfileStatus(db: Db, ghotokId: string, id: string, status: ProfileStatus): Promise<void> {
  await getProfile(db, ghotokId, id);
  await db.update(profile).set({ status }).where(and(eq(profile.id, id), eq(profile.ghotokId, ghotokId)));
}

export async function deleteProfile(db: Db, ghotokId: string, id: string): Promise<void> {
  await getProfile(db, ghotokId, id);
  await db.delete(profile).where(and(eq(profile.id, id), eq(profile.ghotokId, ghotokId)));
}

/** The row, or AppError("not_found"). Always scoped to the ghotok, so nobody reads another ghotok's people. */
export async function getProfile(db: Db, ghotokId: string, id: string): Promise<Profile> {
  const row = await db.query.profile.findFirst({ where: and(eq(profile.id, id), eq(profile.ghotokId, ghotokId)) });
  if (!row) throw new AppError("not_found");
  return row;
}

export interface ProfileFilter {
  kind: ProfileKind;
  /** matches name, village, upazila or district */
  q?: string;
  status?: ProfileStatus | "all";
  /** the biodata number, exact */
  code?: number;
  /** an age band in whole years, both ends inclusive */
  ageMin?: number;
  ageMax?: number;
  /** a place exactly as written when the person was added */
  district?: string;
  upazila?: string;
  religion?: Religion;
  maritalStatus?: MaritalStatus;
  /** a word in the education or profession field */
  education?: string;
  profession?: string;
  /** height in cm and monthly income in taka, both ends inclusive */
  heightMin?: number;
  heightMax?: number;
  incomeMin?: number;
}

export async function listProfiles(db: Db, ghotokId: string, filter: ProfileFilter): Promise<Profile[]> {
  const where: SQL[] = [eq(profile.ghotokId, ghotokId), eq(profile.kind, filter.kind)];
  if (filter.status && filter.status !== "all") where.push(eq(profile.status, filter.status));
  if (filter.code !== undefined) where.push(eq(profile.code, filter.code));
  // an age band becomes birth-year bounds: someone aged 25 this year was born in (year - 25)
  const year = currentYear();
  if (filter.ageMin !== undefined) where.push(lte(profile.birthYear, year - filter.ageMin));
  if (filter.ageMax !== undefined) where.push(gte(profile.birthYear, year - filter.ageMax));
  if (filter.district) where.push(eq(profile.district, filter.district));
  if (filter.upazila) where.push(eq(profile.upazila, filter.upazila));
  if (filter.religion) where.push(eq(profile.religion, filter.religion));
  if (filter.maritalStatus) where.push(eq(profile.maritalStatus, filter.maritalStatus));
  if (filter.education) where.push(ilike(profile.education, `%${filter.education}%`));
  if (filter.profession) where.push(ilike(profile.profession, `%${filter.profession}%`));
  if (filter.heightMin !== undefined) where.push(gte(profile.heightCm, filter.heightMin));
  if (filter.heightMax !== undefined) where.push(lte(profile.heightCm, filter.heightMax));
  if (filter.incomeMin !== undefined) where.push(gte(profile.monthlyIncome, filter.incomeMin));
  if (filter.q) {
    const like = `%${filter.q}%`;
    const match = or(ilike(profile.name, like), ilike(profile.village, like), ilike(profile.upazila, like), ilike(profile.district, like));
    if (match) where.push(match);
  }
  return db.select().from(profile).where(and(...where)).orderBy(desc(profile.updatedAt));
}

/** Just enough for a <select> of people to pair up. */
export async function activeProfiles(db: Db, ghotokId: string, kind: ProfileKind) {
  return db.select({ id: profile.id, name: profile.name, district: profile.district, birthYear: profile.birthYear })
    .from(profile)
    .where(and(eq(profile.ghotokId, ghotokId), eq(profile.kind, kind), eq(profile.status, "active")))
    .orderBy(profile.name);
}

/** How many patro and patri are still looking, for the dashboard and the front page. */
export async function activeCounts(db: Db, ghotokId: string): Promise<{ patro: number; patri: number }> {
  const rows = await db.select({ kind: profile.kind, n: count() }).from(profile)
    .where(and(eq(profile.ghotokId, ghotokId), eq(profile.status, "active"))).groupBy(profile.kind);
  return { patro: rows.find((r) => r.kind === "patro")?.n ?? 0, patri: rows.find((r) => r.kind === "patri")?.n ?? 0 };
}

/** Every district and upazila this ghotok has written on someone, as choices for the search bar. */
export async function places(db: Db, ghotokId: string): Promise<Place[]> {
  return db.selectDistinct({ district: profile.district, upazila: profile.upazila }).from(profile)
    .where(eq(profile.ghotokId, ghotokId)).orderBy(profile.district, profile.upazila);
}

/** The people added or edited most recently, both kinds together, for the dashboard. */
export async function recentProfiles(db: Db, ghotokId: string, limit = 6) {
  return db.select({ id: profile.id, code: profile.code, kind: profile.kind, name: profile.name, district: profile.district, photoUrl: profile.photoUrl, status: profile.status })
    .from(profile).where(eq(profile.ghotokId, ghotokId)).orderBy(desc(profile.updatedAt)).limit(limit);
}

export type RecentProfile = Awaited<ReturnType<typeof recentProfiles>>[number];

export const RELIGIONS: Religion[] = ["islam", "hindu", "christian", "buddhist", "other"];
export const MARITAL_STATUSES: MaritalStatus[] = ["obibahito", "talakprapto", "bidhoba"];
