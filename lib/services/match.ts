import { and, eq, inArray, or } from "drizzle-orm";
import type { Db } from "../db";
import { profile, proposal, type Profile } from "../db/schema";
import { ageFromYear } from "../time";
import { FAMILY_VIEW } from "./share";

/** Why two people might suit each other; the page turns the key into words in the user's language ("reason.*"). */
export interface Reason {
  key: "sameDistrict" | "sameUpazila" | "ageGap" | "sameEducation" | "maritalMatch" | "fitsAge" | "fitsDistrict" | "fitsMarital";
  /** the age gap in years, for "ageGap" */
  n?: number;
}

export interface Suggestion {
  candidate: Profile;
  score: number;
  reasons: Reason[];
}

const norm = (s: string | null) => (s ?? "").trim().toLowerCase();

/**
 * A simple, explainable score: same religion is required (filtered before this runs); then the same
 * area, a sensible age gap and a similar background each add points. The ghotok still decides.
 */
export function scorePair(patro: Profile, patri: Profile): { score: number; reasons: Reason[] } {
  const reasons: Reason[] = [];
  let score = 0;
  if (norm(patro.district) === norm(patri.district)) { score += 3; reasons.push({ key: "sameDistrict" }); }
  if (patro.upazila && norm(patro.upazila) === norm(patri.upazila)) { score += 2; reasons.push({ key: "sameUpazila" }); }
  const gap = ageFromYear(patro.birthYear) - ageFromYear(patri.birthYear);
  if (gap >= 0 && gap <= 10) { score += 3; reasons.push({ key: "ageGap", n: gap }); }
  else if (gap > -3 && gap <= 15) { score += 1; reasons.push({ key: "ageGap", n: Math.abs(gap) }); }
  if (patro.education && norm(patro.education) === norm(patri.education)) { score += 1; reasons.push({ key: "sameEducation" }); }
  if ((patro.maritalStatus === "obibahito") === (patri.maritalStatus === "obibahito")) { score += 1; reasons.push({ key: "maritalMatch" }); }
  // what each side asked for on the form, where they filled it in
  const fits = (who: Profile, other: Profile) => ({
    age: who.expectAgeMin !== null || who.expectAgeMax !== null
      ? (who.expectAgeMin ?? 0) <= ageFromYear(other.birthYear) && ageFromYear(other.birthYear) <= (who.expectAgeMax ?? 200) : null,
    district: who.expectDistricts ? who.expectDistricts.split(/[,،]/).map(norm).filter(Boolean).includes(norm(other.district)) : null,
    marital: who.expectMarital
      ? who.expectMarital === "obibahito" ? other.maritalStatus === "obibahito"
        : who.expectMarital === "talak_ok" ? other.maritalStatus !== "bidhoba" : true
      : null,
  });
  const a = fits(patro, patri), b = fits(patri, patro);
  if (a.age || b.age) { score += 2; reasons.push({ key: "fitsAge" }); }
  if (a.district || b.district) { score += 2; reasons.push({ key: "fitsDistrict" }); }
  if (a.marital || b.marital) { score += 1; reasons.push({ key: "fitsMarital" }); }
  return { score, reasons };
}

/** Up to `limit` listed, active people of the other kind, best first, leaving out pairs already proposed. */
export async function suggestFor(db: Db, ghotokId: string, person: Profile, limit = 5): Promise<Suggestion[]> {
  const otherKind = person.kind === "patro" ? "patri" : "patro";
  const [candidates, existing] = await Promise.all([
    db.select().from(profile).where(and(
      eq(profile.ghotokId, ghotokId), eq(profile.kind, otherKind), eq(profile.status, "active"), eq(profile.approval, "approved"),
      eq(profile.religion, person.religion),
    )),
    db.select({ patroId: proposal.patroId, patriId: proposal.patriId }).from(proposal)
      .where(and(eq(proposal.ghotokId, ghotokId), or(eq(proposal.patroId, person.id), eq(proposal.patriId, person.id)))),
  ]);
  const taken = new Set(existing.flatMap((p) => [p.patroId, p.patriId]));

  return candidates
    .filter((c) => !taken.has(c.id))
    .map((candidate) => ({ candidate, ...(person.kind === "patro" ? scorePair(person, candidate) : scorePair(candidate, person)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * "আপনার জন্য মিল": for each of a family's own listed biodata still looking, the best listed people of the other
 * kind, as a family sees them (FAMILY_VIEW, no names). Scored like the ghotok's suggestions; pairs already proposed
 * are left out. Best first, each person once.
 */
export async function matchesForFamily(db: Db, ghotokId: string, ownerUserId: string, limit = 4) {
  const own = await db.select().from(profile).where(and(
    eq(profile.ghotokId, ghotokId), eq(profile.ownerUserId, ownerUserId), eq(profile.approval, "approved"), eq(profile.status, "active"),
  ));
  const best = new Map<string, { score: number; reasons: Reason[]; forId: string }>();
  for (const person of own) {
    for (const s of await suggestFor(db, ghotokId, person, limit)) {
      if (s.score <= 0 || (best.get(s.candidate.id)?.score ?? -1) >= s.score) continue;
      best.set(s.candidate.id, { score: s.score, reasons: s.reasons, forId: person.id });
    }
  }
  const ranked = [...best.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, limit);
  if (!ranked.length) return [];
  const rows = await db.select({ id: profile.id, ...FAMILY_VIEW }).from(profile)
    .where(and(eq(profile.ghotokId, ghotokId), inArray(profile.id, ranked.map(([id]) => id))));
  const byId = new Map(rows.map((r) => [r.id, r] as const));
  return ranked.flatMap(([id, m]) => {
    const b = byId.get(id);
    return b ? [{ b, reasons: m.reasons, forId: m.forId }] : [];
  });
}
