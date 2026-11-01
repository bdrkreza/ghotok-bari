// The answers a biodata's pick-one questions allow, the legal minimum ages, and what to say when a required field is
// empty. Plain data, shared by the form in the browser and the services on the server (which re-export it), so the
// form never pulls server code (the database, the photo store) into the browser's bundle.
import type {
  AfterHome, BloodGroup, Choice, Complexion, Dowry, EducationMedium, ExpectEducation, ExpectMarital, FamilyStatus, MaritalStatus,
  ProfileKind, Religion,
} from "./db/schema";
import type { FieldIssue } from "./errors";

// Legal minimum ages in Bangladesh (Child Marriage Restraint Act 2017): groom 21, bride 18.
export const MIN_AGE: Record<ProfileKind, number> = { patro: 21, patri: 18 };

export const COMPLEXIONS: readonly [Complexion, ...Complexion[]] = ["forsha", "ujjol_shyamla", "shyamla", "kalo"];
export const BLOOD_GROUPS: readonly [BloodGroup, ...BloodGroup[]] = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
export const EDUCATION_MEDIUMS: readonly [EducationMedium, ...EducationMedium[]] = ["general", "madrasa", "english"];
export const FAMILY_STATUSES: readonly [FamilyStatus, ...FamilyStatus[]] = ["nimno", "moddho", "uccho_moddho", "uccho"];
export const CHOICES: readonly [Choice, ...Choice[]] = ["yes", "no", "discuss"];
export const AFTER_HOMES: readonly [AfterHome, ...AfterHome[]] = ["family", "city", "abroad", "undecided"];
export const DOWRIES: readonly [Dowry, ...Dowry[]] = ["none", "gift", "discuss"];
export const EXPECT_EDUCATIONS: readonly [ExpectEducation, ...ExpectEducation[]] = ["ssc", "hsc", "bachelor", "master"];
export const EXPECT_MARITALS: readonly [ExpectMarital, ...ExpectMarital[]] = ["obibahito", "talak_ok", "bidhoba_ok"];
export const RELIGIONS: Religion[] = ["islam", "hindu", "christian", "buddhist", "other"];
export const MARITAL_STATUSES: MaritalStatus[] = ["obibahito", "talakprapto", "bidhoba"];

/**
 * Fields required beyond name, birth year and district (which everyone fills), by who writes the biodata. The ghotok
 * often opens one during a phone call, so only the guardian's number, without which nobody can be called back (not
 * asked on a family's own biodata, whose account has a phone). A family writes for other families to read, so the
 * three things every card and search shows.
 */
export const GHOTOK_REQUIRED = ["guardianPhone"] as const;
export const FAMILY_REQUIRED = ["heightCm", "education", "profession"] as const;

/** What to say when a required field was left empty: it names what to write, not just "fill this". */
export function missing(name: string, kind: ProfileKind): FieldIssue {
  if (name === "name") return { code: kind === "patri" ? "need_name_patri" : "need_name_patro" };
  if (name === "birthYear") return { code: "need_birth_year" };
  if (name === "district") return { code: "need_district" };
  if (name === "guardianPhone") return { code: "need_guardian_phone" };
  if (name === "heightCm") return { code: "need_height" };
  if (name === "education") return { code: "need_education" };
  if (name === "profession") return { code: "need_profession" };
  return { code: "required" };
}

