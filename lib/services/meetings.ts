import { and, asc, count, desc, eq, gte, lt } from "drizzle-orm";
import type { Db } from "../db";
import { meeting, profile, proposal } from "../db/schema";
import { AppError } from "../errors";
import { today } from "../time";
import { notify } from "./notices";

// "দেখা-দেখি": when and where two families meet over a proposal. Times are kept as moments; the form sends Dhaka
// wall-clock time ("2026-11-05T16:30"), read here as +06:00 (Bangladesh has no DST).

const DAY = 24 * 3600 * 1000;

/** Midnight in Dhaka at the start of the day `now` falls on. */
export const dhakaMidnight = (now = new Date()) => new Date(`${today(now)}T00:00:00+06:00`);

/** "YYYY-MM-DDTHH:MM" from a datetime-local field, as the moment it names in Dhaka; null when it is not one. */
export function parseDhakaTime(value: string): Date | null {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/.test(value)) return null;
  const at = new Date(`${value}:00+06:00`);
  return Number.isNaN(at.getTime()) ? null : at;
}

/**
 * Set a meeting on one of this ghotok's proposals. Each family who wrote one of the two biodata gets a notice (their
 * own biodata's number, the time and the place). Returns the new id.
 */
export async function addMeeting(db: Db, ghotokId: string, proposalId: string, input: { at: string; place?: string; note?: string }): Promise<string> {
  const at = parseDhakaTime(input.at);
  if (!at) throw new AppError("invalid_input");
  const p = await db.query.proposal.findFirst({
    where: and(eq(proposal.id, proposalId), eq(proposal.ghotokId, ghotokId)),
    with: { patro: { columns: { id: true, ownerUserId: true } }, patri: { columns: { id: true, ownerUserId: true } } },
  });
  if (!p) throw new AppError("not_found");
  const place = input.place?.trim().slice(0, 200) || null;
  const note = input.note?.trim().slice(0, 500) || null;
  const id = crypto.randomUUID();
  await db.insert(meeting).values({ id, ghotokId, proposalId, at, place, note });
  // one family may have written both (it happens with relatives): one notice each, for their own biodata
  const told = new Set<string>();
  for (const side of [p.patro, p.patri]) {
    if (!side.ownerUserId || told.has(side.ownerUserId)) continue;
    told.add(side.ownerUserId);
    await notify(db, ghotokId, side.ownerUserId, "meeting", side.id, place, at);
  }
  return id;
}

export async function deleteMeeting(db: Db, ghotokId: string, id: string): Promise<void> {
  await db.delete(meeting).where(and(eq(meeting.id, id), eq(meeting.ghotokId, ghotokId)));
}

const withPair = {
  proposal: {
    columns: { id: true, status: true },
    with: { patro: { columns: { id: true, name: true } }, patri: { columns: { id: true, name: true } } },
  },
} as const;

/** From the start of today on, soonest first: today's earlier ones stay until the day is over. */
export async function upcomingMeetings(db: Db, ghotokId: string, now = new Date(), limit = 100) {
  return db.query.meeting.findMany({
    where: and(eq(meeting.ghotokId, ghotokId), gte(meeting.at, dhakaMidnight(now))),
    with: withPair, orderBy: [asc(meeting.at)], limit,
  });
}

/** The last `days` days before today, latest first. */
export async function pastMeetings(db: Db, ghotokId: string, now = new Date(), days = 30) {
  const start = dhakaMidnight(now);
  return db.query.meeting.findMany({
    where: and(eq(meeting.ghotokId, ghotokId), gte(meeting.at, new Date(start.getTime() - days * DAY)), lt(meeting.at, start)),
    with: withPair, orderBy: [desc(meeting.at)],
  });
}

export type MeetingRow = Awaited<ReturnType<typeof upcomingMeetings>>[number];

/** Meetings on one proposal, soonest first. */
export async function meetingsOf(db: Db, ghotokId: string, proposalId: string) {
  return db.select().from(meeting).where(and(eq(meeting.ghotokId, ghotokId), eq(meeting.proposalId, proposalId))).orderBy(asc(meeting.at));
}

/** Today's and tomorrow's: what the bell reminds the ghotok of. */
export async function soonMeetingCount(db: Db, ghotokId: string, now = new Date()): Promise<number> {
  const start = dhakaMidnight(now);
  const [row] = await db.select({ n: count() }).from(meeting)
    .where(and(eq(meeting.ghotokId, ghotokId), gte(meeting.at, start), lt(meeting.at, new Date(start.getTime() + 2 * DAY))));
  return row?.n ?? 0;
}

/** Which day a meeting falls on, from today: 0 today, 1 tomorrow, more later, below 0 before. */
export function dayFromToday(at: Date, now = new Date()): number {
  return Math.floor((at.getTime() - dhakaMidnight(now).getTime()) / DAY);
}

/** A family's own meetings to come, for their page: those on proposals that include a biodata they wrote. */
export async function myMeetings(db: Db, ghotokId: string, ownerUserId: string, now = new Date()) {
  const rows = await db.select({ id: meeting.id, at: meeting.at, place: meeting.place, patroId: proposal.patroId, patriId: proposal.patriId })
    .from(meeting).innerJoin(proposal, eq(proposal.id, meeting.proposalId))
    .where(and(eq(meeting.ghotokId, ghotokId), gte(meeting.at, dhakaMidnight(now))))
    .orderBy(asc(meeting.at));
  if (!rows.length) return [];
  const own = await db.select({ id: profile.id, kind: profile.kind, code: profile.code }).from(profile)
    .where(and(eq(profile.ghotokId, ghotokId), eq(profile.ownerUserId, ownerUserId)));
  const byId = new Map(own.map((p) => [p.id, p] as const));
  return rows.flatMap((r) => {
    const mine = byId.get(r.patroId) ?? byId.get(r.patriId);
    return mine ? [{ id: r.id, at: r.at, place: r.place, kind: mine.kind, code: mine.code }] : [];
  });
}
