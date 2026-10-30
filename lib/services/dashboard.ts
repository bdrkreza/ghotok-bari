import { and, count, eq, inArray } from "drizzle-orm";
import type { Db } from "../db";
import { proposal } from "../db/schema";
import type { Place } from "../search";
import { totals, type Totals } from "./ledger";
import { activeCounts, places, recentProfiles, type RecentProfile } from "./profiles";
import { LIVE, listProposals, type ProposalRow } from "./proposals";

export interface Dashboard {
  patro: number;
  patri: number;
  live: number;
  fixed: number;
  money: Totals;
  recent: ProposalRow[];
  /** the latest people, for the "সাম্প্রতিক প্রোফাইল" row */
  people: RecentProfile[];
  /** every district and upazila on file, as choices for the search bar */
  places: Place[];
}

export async function dashboard(db: Db, ghotokId: string): Promise<Dashboard> {
  const [counts, live, fixed, money, recent, people, seen] = await Promise.all([
    activeCounts(db, ghotokId),
    db.select({ n: count() }).from(proposal).where(and(eq(proposal.ghotokId, ghotokId), inArray(proposal.status, LIVE))),
    db.select({ n: count() }).from(proposal).where(and(eq(proposal.ghotokId, ghotokId), inArray(proposal.status, ["thik_hoyeche", "biye_hoyeche"]))),
    totals(db, ghotokId),
    listProposals(db, ghotokId, "live"),
    recentProfiles(db, ghotokId),
    places(db, ghotokId),
  ]);
  return {
    ...counts,
    live: live[0]?.n ?? 0,
    fixed: fixed[0]?.n ?? 0,
    money,
    recent: recent.slice(0, 5),
    people,
    places: seen,
  };
}
