import { and, count, eq, inArray } from "drizzle-orm";
import type { Db } from "../db";
import { proposal } from "../db/schema";
import type { Place } from "../search";
import { totals, type Totals } from "./ledger";
import { activeCounts, pendingCount, places, recentProfiles, type RecentProfile } from "./profiles";
import { newInterestCount } from "./interests";
import { LIVE, dueFollowUps, listProposals, type FollowUpRow, type ProposalRow } from "./proposals";

export interface Dashboard {
  patro: number;
  patri: number;
  live: number;
  fixed: number;
  /** biodata families handed in that wait for the ghotok */
  pending: number;
  /** "আগ্রহ জানান" requests not yet handled */
  interests: number;
  /** live proposals whose call-back day has come */
  followUps: FollowUpRow[];
  money: Totals;
  recent: ProposalRow[];
  /** the latest people, for the "সাম্প্রতিক প্রোফাইল" row */
  people: RecentProfile[];
  /** every district and upazila on file, as choices for the search bar */
  places: Place[];
}

export async function dashboard(db: Db, ghotokId: string): Promise<Dashboard> {
  const [counts, live, fixed, pending, money, recent, people, seen, interests, followUps] = await Promise.all([
    activeCounts(db, ghotokId),
    db.select({ n: count() }).from(proposal).where(and(eq(proposal.ghotokId, ghotokId), inArray(proposal.status, LIVE))),
    db.select({ n: count() }).from(proposal).where(and(eq(proposal.ghotokId, ghotokId), inArray(proposal.status, ["thik_hoyeche", "biye_hoyeche"]))),
    pendingCount(db, ghotokId),
    totals(db, ghotokId),
    listProposals(db, ghotokId, "live"),
    recentProfiles(db, ghotokId),
    places(db, ghotokId),
    newInterestCount(db, ghotokId),
    dueFollowUps(db, ghotokId),
  ]);
  return {
    ...counts,
    live: live[0]?.n ?? 0,
    fixed: fixed[0]?.n ?? 0,
    pending,
    interests,
    followUps,
    money,
    recent: recent.slice(0, 5),
    people,
    places: seen,
  };
}
