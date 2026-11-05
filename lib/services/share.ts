import { and, eq, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { Db } from "../db";
import { biodataShare, profile, user, type Profile } from "../db/schema";
import { getProfile } from "./profiles";

// A public biodata link: /b/<token>. The ghotok switches it on per person, hands the link to a family, and can
// switch it off again. What the link shows is decided in one place (publicBiodata), so nothing private can leak
// by accident when the profile table grows a column.

/** 12 url-safe characters, 72 bits of randomness: nobody guesses it, and it still fits in a WhatsApp message. */
const newToken = () => randomBytes(9).toString("base64url");

/** The live token for this person, or null when the biodata is not shared. */
export async function getShare(db: Db, ghotokId: string, profileId: string): Promise<string | null> {
  const row = await db.query.biodataShare.findFirst({ where: and(eq(biodataShare.profileId, profileId), eq(biodataShare.ghotokId, ghotokId)) });
  return row?.token ?? null;
}

/** Switch sharing on (a second call returns the same link) and return the token. */
export async function shareBiodata(db: Db, ghotokId: string, profileId: string): Promise<string> {
  await getProfile(db, ghotokId, profileId); // not_found when the person is another ghotok's
  const existing = await getShare(db, ghotokId, profileId);
  if (existing) return existing;
  const token = newToken();
  await db.insert(biodataShare).values({ token, ghotokId, profileId });
  return token;
}

/** Switch sharing off: the old link stops working at once. */
export async function unshareBiodata(db: Db, ghotokId: string, profileId: string): Promise<void> {
  await db.delete(biodataShare).where(and(eq(biodataShare.profileId, profileId), eq(biodataShare.ghotokId, ghotokId)));
}

/**
 * The columns a family may see of someone else's biodata, decided here once and used by the public link and by the
 * signed-in lists (lib/services/biodata.ts). The village is shown (the ghotok wants families to see where someone is
 * from); the parents' names only where the family agreed (show_parents), computed in SQL so they never leave the
 * database otherwise; the photo likewise only where agreed (show_photos), and never on the public link. Left out on
 * purpose: name, guardian, income, the ghotok's notes, and who handed it in.
 */
export const FAMILY_VIEW = {
  code: profile.code, kind: profile.kind, birthYear: profile.birthYear, heightCm: profile.heightCm, religion: profile.religion,
  maritalStatus: profile.maritalStatus, education: profile.education, profession: profile.profession, village: profile.village, upazila: profile.upazila,
  district: profile.district, familyDetails: profile.familyDetails, expectations: profile.expectations, status: profile.status,
  complexion: profile.complexion, weightKg: profile.weightKg, bloodGroup: profile.bloodGroup, educationMedium: profile.educationMedium, educationLevel: profile.educationLevel, sscYear: profile.sscYear, sscGroup: profile.sscGroup, hscYear: profile.hscYear, hscGroup: profile.hscGroup, educationSubject: profile.educationSubject,
  educationYear: profile.educationYear, educationStudying: profile.educationStudying, educationResult: profile.educationResult, extraQualifications: profile.extraQualifications,
  workplace: profile.workplace, presentAddress: profile.presentAddress, brothers: profile.brothers, sisters: profile.sisters,
  familyStatus: profile.familyStatus, religiousPractice: profile.religiousPractice, afterStudy: profile.afterStudy, afterJob: profile.afterJob,
  afterHome: profile.afterHome, dowry: profile.dowry, jointFamily: profile.jointFamily, expectAgeMin: profile.expectAgeMin,
  expectAgeMax: profile.expectAgeMax, expectEducation: profile.expectEducation, expectMarital: profile.expectMarital,
  expectDistricts: profile.expectDistricts,
  showParents: profile.showParents,
  showPhotos: profile.showPhotos,
  /** the card picture, where the family agreed; /api/photos lets signed-in families through for these */
  photoUrl: sql<string | null>`case when ${profile.showPhotos} then ${profile.photoUrl} end`,
  fatherName: sql<string | null>`case when ${profile.showParents} then ${profile.fatherName} end`,
  motherName: sql<string | null>`case when ${profile.showParents} then ${profile.motherName} end`,
  // when the ghotok checked it (a family's entry) or wrote it (their own): the trust line under the number
  approvedAt: profile.approvedAt, createdAt: profile.createdAt,
};

/** A row as a family sees it: exactly the FAMILY_VIEW columns, typed from the table. */
export type FamilyView = Pick<Profile, keyof typeof FAMILY_VIEW>;

/** What a family sees from a shared link. */
export interface PublicBiodata extends FamilyView {
  /** who to call */
  ghotok: { name: string; phone: string };
}

/**
 * The one read in lib/services that is not scoped to a signed-in ghotok: the token is the credential.
 * Null for an unknown or switched-off token, or a biodata the ghotok has not approved, so the page shows the usual 404.
 */
export async function publicBiodata(db: Db, token: string): Promise<PublicBiodata | null> {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(token)) return null;
  const rows = await db
    .select({ ...FAMILY_VIEW, ghotokName: user.name, ghotokPhone: user.username })
    .from(biodataShare)
    .innerJoin(profile, eq(profile.id, biodataShare.profileId))
    .innerJoin(user, eq(user.id, biodataShare.ghotokId))
    .where(and(eq(biodataShare.token, token), eq(profile.approval, "approved")))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  const { ghotokName, ghotokPhone, ...rest } = r;
  // a shared link travels anywhere (WhatsApp, Facebook): it never carries a photo, whatever the family agreed to
  return { ...rest, photoUrl: null, ghotok: { name: ghotokName, phone: ghotokPhone ?? "" } };
}
