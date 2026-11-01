import { and, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db";
import {
  profile, user, type AfterHome, type Approval, type BloodGroup, type Choice, type Complexion, type Dowry, type EducationMedium,
  type ExpectEducation, type ExpectMarital, type FamilyStatus, type MaritalStatus, type Profile, type ProfileKind, type ProfileStatus, type Religion,
} from "../db/schema";
import { AppError, type Existing, type FieldIssue, type FieldIssues } from "../errors";
import { normalizePhone } from "../auth/phone";
import type { Place } from "../search";
import { currentYear } from "../time";

// Legal minimum ages in Bangladesh (Child Marriage Restraint Act 2017): groom 21, bride 18.
export const MIN_AGE: Record<ProfileKind, number> = { patro: 21, patri: 18 };

/** runs of spaces become one, so "রহিম  উদ্দিন" and "রহিম উদ্দিন" are the same name */
function oneSpace(s: string) { return s.split(/\s+/).join(" "); }

const optional = (max: number) => z.string().trim().max(max).transform((s) => s || null);
/** "" -> null, otherwise a whole number in range; Bangla digits are accepted */
const optionalInt = (min: number, max: number) =>
  z.string().trim().transform((s, ctx) => {
    if (!s) return null;
    const n = Number(s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))));
    if (!Number.isInteger(n)) { ctx.addIssue({ code: "custom", message: "number" }); return null; }
    if (n < min || n > max) { ctx.addIssue({ code: "custom", message: "range", params: { min, max } }); return null; }
    return n;
  });

/** "" -> null, otherwise one of the given answers */
const pick = <V extends string>(values: readonly [V, ...V[]]) =>
  z.union([z.enum(values), z.literal("")]).transform((s) => (s || null) as V | null);

export const COMPLEXIONS: readonly [Complexion, ...Complexion[]] = ["forsha", "ujjol_shyamla", "shyamla", "kalo"];
export const BLOOD_GROUPS: readonly [BloodGroup, ...BloodGroup[]] = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
export const EDUCATION_MEDIUMS: readonly [EducationMedium, ...EducationMedium[]] = ["general", "madrasa", "english"];
export const FAMILY_STATUSES: readonly [FamilyStatus, ...FamilyStatus[]] = ["nimno", "moddho", "uccho_moddho", "uccho"];
export const CHOICES: readonly [Choice, ...Choice[]] = ["yes", "no", "discuss"];
export const AFTER_HOMES: readonly [AfterHome, ...AfterHome[]] = ["family", "city", "abroad", "undecided"];
export const DOWRIES: readonly [Dowry, ...Dowry[]] = ["none", "gift", "discuss"];
export const EXPECT_EDUCATIONS: readonly [ExpectEducation, ...ExpectEducation[]] = ["ssc", "hsc", "bachelor", "master"];
export const EXPECT_MARITALS: readonly [ExpectMarital, ...ExpectMarital[]] = ["obibahito", "talak_ok", "bidhoba_ok"];

const profileInput = z.object({
  kind: z.enum(["patro", "patri"]),
  name: z.string().trim().min(2).max(80).transform(oneSpace),
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
  complexion: pick(COMPLEXIONS),
  weightKg: optionalInt(20, 300),
  bloodGroup: pick(BLOOD_GROUPS),
  educationMedium: pick(EDUCATION_MEDIUMS),
  workplace: optional(160),
  presentAddress: optional(160),
  brothers: optionalInt(0, 30),
  sisters: optionalInt(0, 30),
  familyStatus: pick(FAMILY_STATUSES),
  religiousPractice: optional(300),
  afterStudy: pick(CHOICES),
  afterJob: pick(CHOICES),
  afterHome: pick(AFTER_HOMES),
  dowry: pick(DOWRIES),
  jointFamily: pick(CHOICES),
  expectAgeMin: optionalInt(18, 80),
  expectAgeMax: optionalInt(18, 80),
  expectEducation: pick(EXPECT_EDUCATIONS),
  expectMarital: pick(EXPECT_MARITALS),
  expectDistricts: optional(200),
  photoUrl: z.union([z.url().max(500), z.literal("")]).transform((s) => s || null),
  notes: optional(2000),
}).superRefine((d, ctx) => {
  if (d.expectAgeMin !== null && d.expectAgeMax !== null && d.expectAgeMin > d.expectAgeMax) ctx.addIssue({ code: "custom", message: "age_range", path: ["expectAgeMax"] });
});

/** Every field the form may send; a missing one is read as empty. */
const FIELDS = Object.keys(profileInput.shape);

/** What to say when a required field was left empty: it names what to write, not just "fill this". */
export function missing(name: string, kind: ProfileKind): FieldIssue {
  if (name === "name") return { code: kind === "patri" ? "need_name_patri" : "need_name_patro" };
  if (name === "birthYear") return { code: "need_birth_year" };
  if (name === "district") return { code: "need_district" };
  return { code: "required" };
}

/** One zod issue as the reason the form shows under that field. */
function fieldIssue(issue: z.core.$ZodIssue, value: string, kind: ProfileKind): FieldIssue {
  const name = String(issue.path[0] ?? "");
  if (issue.code === "too_small") return value.trim() ? { code: "short", vars: { n: Number(issue.minimum) } } : missing(name, kind);
  if (issue.code === "too_big") return { code: "long", vars: { n: Number(issue.maximum) } };
  if (issue.code === "custom") {
    if (issue.message === "range") {
      const { min, max } = issue.params as { min: number; max: number };
      return max >= 100_000_000 ? { code: "min", vars: { min } } : { code: "range", vars: { min, max } };
    }
    if (issue.message === "number" || issue.message === "phone") return { code: issue.message };
    if (issue.message === "age_range") return { code: "age_order" };
    return missing(name, kind); // the birth year's "must have one" check
  }
  if (issue.path[0] === "photoUrl") return { code: "url" };
  return { code: "choice" };
}

/**
 * Raw form fields -> a validated row body. Throws AppError with a code for the form's top line and, per refused
 * field, the reason to show under it (the first problem found for each field).
 */
export function parseProfile(raw: Record<string, string>) {
  const filled = Object.fromEntries(FIELDS.map((k) => [k, raw[k] ?? ""]));
  const parsed = profileInput.safeParse(filled);
  if (!parsed.success) {
    const fields: FieldIssues = {};
    for (const issue of parsed.error.issues) {
      const name = String(issue.path[0] ?? "");
      if (name && !fields[name]) fields[name] = fieldIssue(issue, filled[name] ?? "", filled.kind === "patri" ? "patri" : "patro");
    }
    throw new AppError("invalid_input", parsed.error.message, fields);
  }
  const data = parsed.data;
  const age = currentYear() - data.birthYear;
  if (age < MIN_AGE[data.kind]) {
    const young = { code: data.kind === "patro" ? "young_patro" : "young_patri", vars: { age: MIN_AGE[data.kind], year: currentYear() - MIN_AGE[data.kind] } } as const;
    throw new AppError(data.kind === "patro" ? "patro_too_young" : "patri_too_young", undefined, { birthYear: young });
  }
  // the "after marriage" questions differ by kind; whatever the other kind's fields carry is dropped
  if (data.kind === "patro") data.jointFamily = null;
  else { data.afterHome = null; data.dowry = null; }
  return data;
}

/**
 * Add a person. Written by the ghotok it is in the lists at once; written by a family (`ownerUserId`) it waits for
 * the ghotok's approval (lib/services/biodata.ts). The biodata number is handed out either way, so families can
 * quote it when they call.
 */
/**
 * A biodata that looks like the same person: the same kind, name (spaces and letter case aside) and birth year,
 * optionally also the same district, or written from the same family account. `exceptId` leaves one row out (the one
 * being edited). Scoped to the ghotok like every read.
 */
export async function findSame(db: Db, ghotokId: string, who: {
  kind: ProfileKind; name: string; birthYear: number; district?: string; ownerUserId?: string; exceptId?: string;
}): Promise<Existing | null> {
  const name = oneSpace(who.name.trim()).toLowerCase();
  const [row] = await db.select({ id: profile.id, kind: profile.kind, code: profile.code }).from(profile).where(and(
    eq(profile.ghotokId, ghotokId), eq(profile.kind, who.kind), eq(profile.birthYear, who.birthYear),
    sql`lower(regexp_replace(btrim(${profile.name}), '[[:space:]]+', ' ', 'g')) = ${name}`,
    who.district ? sql`lower(btrim(${profile.district})) = ${who.district.trim().toLowerCase()}` : undefined,
    who.ownerUserId ? eq(profile.ownerUserId, who.ownerUserId) : undefined,
    who.exceptId ? sql`${profile.id} <> ${who.exceptId}` : undefined,
  )).orderBy(desc(profile.createdAt)).limit(1);
  return row ?? null;
}

/**
 * Add a person.
 * @param warnSame the ghotok's form: if someone with the same name, birth year and district is already in the book,
 *   refuse with AppError("maybe_same") pointing at them; the form then offers "add anyway", which posts without it.
 */
export async function createProfile(
  db: Db, ghotokId: string, raw: Record<string, string>, owner?: { ownerUserId: string; pledgedAt: Date }, { warnSame = false } = {},
): Promise<string> {
  const data = parseProfile(raw);
  if (warnSame) {
    const same = await findSame(db, ghotokId, { kind: data.kind, name: data.name, birthYear: data.birthYear, district: data.district });
    if (same) throw new AppError("maybe_same", undefined, undefined, same);
  }
  const id = crypto.randomUUID();
  // the next biodata number for this ghotok and kind. People are added one at a time; should two inserts ever
  // race, the unique index (ghotok, kind, code) makes one fail instead of handing out the same number twice.
  const [{ next }] = await db.select({ next: sql<number>`coalesce(max(${profile.code}), 0)::int + 1` }).from(profile)
    .where(and(eq(profile.ghotokId, ghotokId), eq(profile.kind, data.kind)));
  await db.insert(profile).values({ id, ghotokId, code: next, ...data, ...(owner ? { ...owner, approval: "pending" as const } : {}) });
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
  /** which biodata to include; the lists show only approved ones unless told otherwise */
  approval?: Approval | "all";
  /** match `q` against upazila and district only (what a family is shown), never the name or village */
  placesOnly?: boolean;
}

/** The WHERE of a list, shared by the ghotok's full rows and the family's view (lib/services/biodata.ts). */
export function profileWhere(ghotokId: string, filter: ProfileFilter): SQL | undefined {
  const where: SQL[] = [eq(profile.ghotokId, ghotokId), eq(profile.kind, filter.kind)];
  const approval = filter.approval ?? "approved";
  if (approval !== "all") where.push(eq(profile.approval, approval));
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
    const match = filter.placesOnly
      ? or(ilike(profile.upazila, like), ilike(profile.district, like))
      : or(ilike(profile.name, like), ilike(profile.village, like), ilike(profile.upazila, like), ilike(profile.district, like));
    if (match) where.push(match);
  }
  return and(...where);
}

export async function listProfiles(db: Db, ghotokId: string, filter: ProfileFilter): Promise<Profile[]> {
  return db.select().from(profile).where(profileWhere(ghotokId, filter)).orderBy(desc(profile.updatedAt));
}

const listed = (ghotokId: string) => and(eq(profile.ghotokId, ghotokId), eq(profile.approval, "approved"));

/** Just enough for a <select> of people to pair up. */
export async function activeProfiles(db: Db, ghotokId: string, kind: ProfileKind) {
  return db.select({ id: profile.id, name: profile.name, district: profile.district, birthYear: profile.birthYear })
    .from(profile)
    .where(and(listed(ghotokId), eq(profile.kind, kind), eq(profile.status, "active")))
    .orderBy(profile.name);
}

/** How many patro and patri are still looking, for the dashboard and the front page. */
export async function activeCounts(db: Db, ghotokId: string): Promise<{ patro: number; patri: number }> {
  const rows = await db.select({ kind: profile.kind, n: count() }).from(profile)
    .where(and(listed(ghotokId), eq(profile.status, "active"))).groupBy(profile.kind);
  return { patro: rows.find((r) => r.kind === "patro")?.n ?? 0, patri: rows.find((r) => r.kind === "patri")?.n ?? 0 };
}

/* ---------- biodata handed in by families ---------- */

/** Biodata families handed in that wait for the ghotok ("pending"), or were sent back ("returned"); newest first, with who wrote each. */
export async function submittedProfiles(db: Db, ghotokId: string, approval: "pending" | "returned") {
  return db.select({ profile, owner: { name: user.name, phone: user.username } }).from(profile)
    .leftJoin(user, eq(user.id, profile.ownerUserId))
    .where(and(eq(profile.ghotokId, ghotokId), eq(profile.approval, approval)))
    .orderBy(desc(profile.updatedAt));
}

export type SubmittedRow = Awaited<ReturnType<typeof submittedProfiles>>[number];

/** How many biodata wait for the ghotok's decision. */
export async function pendingCount(db: Db, ghotokId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(profile).where(and(eq(profile.ghotokId, ghotokId), eq(profile.approval, "pending")));
  return row?.n ?? 0;
}

/** The family account behind a biodata, for the ghotok's screen; null when the ghotok wrote it. */
export async function profileOwner(db: Db, ghotokId: string, p: Profile): Promise<{ name: string; phone: string } | null> {
  if (!p.ownerUserId || p.ghotokId !== ghotokId) return null;
  const [row] = await db.select({ name: user.name, phone: user.username }).from(user).where(eq(user.id, p.ownerUserId));
  return row ? { name: row.name, phone: row.phone ?? "" } : null;
}

/** The ghotok's decision on a biodata: approving puts it in the lists, returning hands it back to the family with a note. */
export async function setApproval(db: Db, ghotokId: string, id: string, decision: "approved" | "returned", note = ""): Promise<void> {
  await getProfile(db, ghotokId, id);
  const change = decision === "approved"
    ? { approval: "approved" as const, returnNote: null, approvedAt: new Date() }
    : { approval: "returned" as const, returnNote: note.trim() || null, approvedAt: null };
  await db.update(profile).set(change).where(and(eq(profile.id, id), eq(profile.ghotokId, ghotokId)));
}

/** Every district and upazila this ghotok has written on someone, as choices for the search bar. */
export async function places(db: Db, ghotokId: string): Promise<Place[]> {
  return db.selectDistinct({ district: profile.district, upazila: profile.upazila }).from(profile)
    .where(eq(profile.ghotokId, ghotokId)).orderBy(profile.district, profile.upazila);
}

/** The listed people added or edited most recently, both kinds together, for the dashboard. */
export async function recentProfiles(db: Db, ghotokId: string, limit = 6) {
  return db.select({ id: profile.id, code: profile.code, kind: profile.kind, name: profile.name, district: profile.district, photoUrl: profile.photoUrl, status: profile.status })
    .from(profile).where(listed(ghotokId)).orderBy(desc(profile.updatedAt)).limit(limit);
}

export type RecentProfile = Awaited<ReturnType<typeof recentProfiles>>[number];

export const RELIGIONS: Religion[] = ["islam", "hindu", "christian", "buddhist", "other"];
export const MARITAL_STATUSES: MaritalStatus[] = ["obibahito", "talakprapto", "bidhoba"];
