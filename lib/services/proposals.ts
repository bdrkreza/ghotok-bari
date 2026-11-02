import { and, asc, desc, eq, inArray, isNotNull, lte, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "../db";
import { meeting, profile, proposal, proposalEvent, type ProposalStatus } from "../db/schema";
import { AppError } from "../errors";
import { getProfile } from "./profiles";
import { today } from "../time";

/** Which status can follow which. "bad" (dropped) is reachable from every live state. */
const NEXT: Record<ProposalStatus, ProposalStatus[]> = {
  prostab: ["dekha_shona", "kotha_cholche", "bad"],
  dekha_shona: ["kotha_cholche", "thik_hoyeche", "bad"],
  kotha_cholche: ["thik_hoyeche", "bad"],
  thik_hoyeche: ["biye_hoyeche", "bad"],
  biye_hoyeche: [],
  bad: ["prostab"],
};

export const nextStatuses = (from: ProposalStatus): ProposalStatus[] => NEXT[from];

/** Statuses where the talks are still going. */
export const LIVE: ProposalStatus[] = ["prostab", "dekha_shona", "kotha_cholche", "thik_hoyeche"];

export async function createProposal(db: Db, ghotokId: string, input: { patroId: string; patriId: string; note: string }): Promise<string> {
  if (!input.patroId || !input.patriId) throw new AppError("same_kind");
  const [patro, patri] = await Promise.all([getProfile(db, ghotokId, input.patroId), getProfile(db, ghotokId, input.patriId)]);
  if (patro.kind !== "patro" || patri.kind !== "patri") throw new AppError("same_kind");
  // a biodata a family handed in is proposed only once the ghotok has approved it
  if (patro.approval !== "approved" || patri.approval !== "approved") throw new AppError("not_approved");
  const existing = await db.query.proposal.findFirst({ where: and(eq(proposal.patroId, patro.id), eq(proposal.patriId, patri.id)) });
  if (existing) throw new AppError("proposal_exists");

  const id = crypto.randomUUID();
  const note = input.note.trim() || null;
  await db.transaction(async (tx) => {
    await tx.insert(proposal).values({ id, ghotokId, patroId: patro.id, patriId: patri.id, note });
    await tx.insert(proposalEvent).values({ id: crypto.randomUUID(), proposalId: id, kind: "created", toStatus: "prostab", note });
  });
  return id;
}

export async function getProposal(db: Db, ghotokId: string, id: string) {
  const row = await db.query.proposal.findFirst({
    where: and(eq(proposal.id, id), eq(proposal.ghotokId, ghotokId)),
    with: {
      patro: true,
      patri: true,
      events: { orderBy: [desc(proposalEvent.createdAt)] },
      ledger: true,
      meetings: { orderBy: [asc(meeting.at)] },
    },
  });
  if (!row) throw new AppError("not_found");
  return row;
}

export type ProposalDetail = Awaited<ReturnType<typeof getProposal>>;

export async function changeStatus(db: Db, ghotokId: string, id: string, to: ProposalStatus, note: string): Promise<void> {
  const row = await getProposal(db, ghotokId, id);
  if (!NEXT[row.status].includes(to)) throw new AppError("bad_transition");
  const trimmed = note.trim() || null;

  await db.transaction(async (tx) => {
    await tx.update(proposal).set({ status: to }).where(eq(proposal.id, id));
    await tx.insert(proposalEvent).values({ id: crypto.randomUUID(), proposalId: id, kind: "status", fromStatus: row.status, toStatus: to, note: trimmed });

    // The two people follow the proposal: engaged when a match is fixed, married after the wedding,
    // and back to looking when a fixed match falls through.
    const both = [row.patroId, row.patriId];
    if (to === "thik_hoyeche") {
      await tx.update(profile).set({ status: "engaged" }).where(inArray(profile.id, both));
    } else if (to === "biye_hoyeche") {
      await tx.update(profile).set({ status: "married" }).where(inArray(profile.id, both));
    } else if (to === "bad" && row.status === "thik_hoyeche") {
      await tx.update(profile).set({ status: "active" }).where(and(inArray(profile.id, both), eq(profile.status, "engaged")));
    }
  });
}

export async function addNote(db: Db, ghotokId: string, id: string, note: string): Promise<void> {
  await getProposal(db, ghotokId, id);
  const trimmed = note.trim();
  if (!trimmed) throw new AppError("invalid_input");
  await db.insert(proposalEvent).values({ id: crypto.randomUUID(), proposalId: id, kind: "note", note: trimmed });
}

export async function deleteProposal(db: Db, ghotokId: string, id: string): Promise<void> {
  await getProposal(db, ghotokId, id);
  await db.delete(proposal).where(and(eq(proposal.id, id), eq(proposal.ghotokId, ghotokId)));
}

export type ProposalListFilter = ProposalStatus | "live" | "all";

export async function listProposals(db: Db, ghotokId: string, status: ProposalListFilter = "live") {
  const where: SQL[] = [eq(proposal.ghotokId, ghotokId)];
  if (status === "live") where.push(inArray(proposal.status, LIVE));
  else if (status !== "all") where.push(eq(proposal.status, status));
  return db.query.proposal.findMany({
    where: and(...where),
    with: { patro: true, patri: true },
    orderBy: [desc(proposal.updatedAt)],
  });
}

export type ProposalRow = Awaited<ReturnType<typeof listProposals>>[number];

/** How many proposals each list filter would show, for the counts on the filter chips. */
export async function proposalCounts(db: Db, ghotokId: string): Promise<Record<ProposalListFilter, number>> {
  const rows = await db.select({ status: proposal.status, n: sql<number>`count(*)::int` }).from(proposal)
    .where(eq(proposal.ghotokId, ghotokId)).groupBy(proposal.status);
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<ProposalStatus, number>>;
  const of = (s: ProposalStatus) => by[s] ?? 0;
  return {
    live: LIVE.reduce((sum, s) => sum + of(s), 0),
    all: rows.reduce((sum, r) => sum + r.n, 0),
    prostab: of("prostab"), dekha_shona: of("dekha_shona"), kotha_cholche: of("kotha_cholche"),
    thik_hoyeche: of("thik_hoyeche"), biye_hoyeche: of("biye_hoyeche"), bad: of("bad"),
  };
}

/** Every proposal one person is part of, newest first. */
export async function proposalsFor(db: Db, ghotokId: string, profileId: string) {
  return db.query.proposal.findMany({
    where: and(eq(proposal.ghotokId, ghotokId), or(eq(proposal.patroId, profileId), eq(proposal.patriId, profileId))),
    with: { patro: true, patri: true },
    orderBy: [desc(proposal.updatedAt)],
  });
}

/** Live proposals as [id, "patro ও patri"] pairs for a <select>. */
export async function proposalOptions(db: Db, ghotokId: string): Promise<(readonly [string, string])[]> {
  const rows = await listProposals(db, ghotokId, "live");
  return rows.map((r) => [r.id, `${r.patro.name} ও ${r.patri.name}`] as const);
}

/** Set the day to call the families again ("YYYY-MM-DD"), or clear it with "". */
export async function setFollowUp(db: Db, ghotokId: string, id: string, on: string): Promise<void> {
  await getProposal(db, ghotokId, id);
  const day = on.trim();
  if (day && !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new AppError("invalid_input");
  await db.update(proposal).set({ followUpOn: day || null }).where(and(eq(proposal.id, id), eq(proposal.ghotokId, ghotokId)));
}

/** Live proposals whose call-back day is today or past, the oldest first, with both guardians' numbers. */
export async function dueFollowUps(db: Db, ghotokId: string, on = today()) {
  return db.query.proposal.findMany({
    where: and(eq(proposal.ghotokId, ghotokId), inArray(proposal.status, LIVE), isNotNull(proposal.followUpOn), lte(proposal.followUpOn, on)),
    with: { patro: { columns: { name: true, guardianPhone: true } }, patri: { columns: { name: true, guardianPhone: true } } },
    orderBy: [asc(proposal.followUpOn)],
  });
}

export type FollowUpRow = Awaited<ReturnType<typeof dueFollowUps>>[number];

/** How many live proposals are due a call today or earlier: the number on the bell. */
export async function followUpCount(db: Db, ghotokId: string, on = today()): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(proposal)
    .where(and(eq(proposal.ghotokId, ghotokId), inArray(proposal.status, LIVE), isNotNull(proposal.followUpOn), lte(proposal.followUpOn, on)));
  return row?.n ?? 0;
}
