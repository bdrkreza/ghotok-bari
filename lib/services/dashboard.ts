import { and, count, eq, inArray } from "drizzle-orm";
import type { Db } from "../db";
import { proposal } from "../db/schema";
import type { Place } from "../search";
import { totals, type Totals } from "./ledger";
import { activeCounts, pendingCount, places, recentProfiles, type RecentProfile } from "./profiles";
import { newInterestCount } from "./interests";
import { soonMeetingCount, upcomingMeetings, type MeetingRow } from "./meetings";
import { LIVE, dueFollowUps, followUpCount, listProposals, staleProposals, type FollowUpRow, type ProposalRow, type StaleRow } from "./proposals";

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
  /** live proposals that have not moved for two weeks and have no call-back day */
  stale: StaleRow[];
  /** the next few দেখা-দেখি, from today on */
  meetings: MeetingRow[];
  money: Totals;
  recent: ProposalRow[];
  /** the latest people, for the "সাম্প্রতিক প্রোফাইল" row */
  people: RecentProfile[];
  /** every district and upazila on file, as choices for the search bar */
  places: Place[];
}

export async function dashboard(db: Db, ghotokId: string): Promise<Dashboard> {
  const [counts, live, fixed, pending, money, recent, people, seen, interests, followUps, meetings, stale] = await Promise.all([
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
    upcomingMeetings(db, ghotokId, new Date(), 4),
    staleProposals(db, ghotokId),
  ]);
  return {
    ...counts,
    live: live[0]?.n ?? 0,
    fixed: fixed[0]?.n ?? 0,
    pending,
    interests,
    followUps,
    stale,
    meetings,
    money,
    recent: recent.slice(0, 5),
    people,
    places: seen,
  };
}

/** What waits for the ghotok, for the bell in the bar: four counts, read on every screen, so kept to counts. */
export interface Alerts {
  pending: number;
  interests: number;
  followUps: number;
  /** দেখা-দেখি today and tomorrow */
  meetings: number;
}

export async function alerts(db: Db, ghotokId: string): Promise<Alerts> {
  const [pending, interests, followUps, meetings] = await Promise.all([
    pendingCount(db, ghotokId), newInterestCount(db, ghotokId), followUpCount(db, ghotokId), soonMeetingCount(db, ghotokId),
  ]);
  return { pending, interests, followUps, meetings };
}
