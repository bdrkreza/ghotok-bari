import { and, eq, or } from "drizzle-orm";
import type { Db } from "../db";
import { profile, proposal, type Profile } from "../db/schema";
import { ageFromYear } from "../time";

/** Why two people might suit each other; the page turns the key into words in the user's language ("reason.*"). */
export interface Reason {
  key: "sameDistrict" | "sameUpazila" | "ageGap" | "sameEducation" | "maritalMatch";
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
