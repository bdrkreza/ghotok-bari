import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db";
import { ledgerEntry, proposal, proposalEvent, type LedgerKind } from "../db/schema";
import { AppError } from "../errors";
import { today } from "../time";

const BANGLA = "০১২৩৪৫৬৭৮৯";

const entryInput = z.object({
  kind: z.enum(["chukti", "joma", "khoroch"]),
  amount: z.string().trim().transform((s, ctx) => {
    const n = Number(s.replace(/[০-৯]/g, (d) => String(BANGLA.indexOf(d))).replace(/,/g, ""));
    if (!s || !Number.isInteger(n) || n <= 0) ctx.addIssue({ code: "custom", message: "amount" });
    return n;
  }),
  note: z.string().trim().max(300).transform((s) => s || null),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  proposalId: z.union([z.uuid(), z.literal("")]).transform((s) => s || null),
});

const FIELDS = Object.keys(entryInput.shape);

export async function addEntry(db: Db, ghotokId: string, raw: Record<string, string>): Promise<void> {
  const filled = Object.fromEntries(FIELDS.map((k) => [k, raw[k] ?? ""]));
  const parsed = entryInput.safeParse({ ...filled, entryDate: filled.entryDate || today() });
  if (!parsed.success) {
    const amountBad = parsed.error.issues.some((i) => i.path[0] === "amount");
    throw new AppError(amountBad ? "amount_required" : "invalid_input", parsed.error.message);
  }
  const data = parsed.data;
  if (data.proposalId) {
    const owned = await db.query.proposal.findFirst({ where: and(eq(proposal.id, data.proposalId), eq(proposal.ghotokId, ghotokId)) });
    if (!owned) throw new AppError("not_found");
  }
  await db.insert(ledgerEntry).values({ id: crypto.randomUUID(), ghotokId, ...data });
}

export async function deleteEntry(db: Db, ghotokId: string, id: string): Promise<void> {
  await db.delete(ledgerEntry).where(and(eq(ledgerEntry.id, id), eq(ledgerEntry.ghotokId, ghotokId)));
}

export async function listEntries(db: Db, ghotokId: string, limit = 200) {
  return db.query.ledgerEntry.findMany({
    where: eq(ledgerEntry.ghotokId, ghotokId),
    with: { proposal: { with: { patro: { columns: { name: true } }, patri: { columns: { name: true } } } } },
    orderBy: [desc(ledgerEntry.entryDate), desc(ledgerEntry.createdAt)],
    limit,
  });
}

export type LedgerRow = Awaited<ReturnType<typeof listEntries>>[number];

export interface Totals {
  chukti: number;
  joma: number;
  khoroch: number;
  /** agreed fees not yet received */
  baki: number;
  /** what the ghotok actually kept: received minus own expenses */
  labh: number;
}

export function totalsOf(rows: { kind: LedgerKind; amount: number }[]): Totals {
  const t = { chukti: 0, joma: 0, khoroch: 0 };
  for (const r of rows) t[r.kind] += r.amount;
  return { ...t, baki: t.chukti - t.joma, labh: t.joma - t.khoroch };
}

/** One query for the dashboard tiles. */
export async function totals(db: Db, ghotokId: string): Promise<Totals> {
  const rows = await db
    .select({ kind: ledgerEntry.kind, amount: sql<number>`coalesce(sum(${ledgerEntry.amount}), 0)::int` })
    .from(ledgerEntry)
    .where(eq(ledgerEntry.ghotokId, ghotokId))
    .groupBy(ledgerEntry.kind);
  return totalsOf(rows);
}

export interface Due {
  proposalId: string;
  patro: { name: string; guardianPhone: string | null };
  patri: { name: string; guardianPhone: string | null };
  /** agreed minus received for this match, always above zero */
  baki: number;
}

/** Every match with agreed fees not yet received, the largest sum first. */
export async function dues(db: Db, ghotokId: string): Promise<Due[]> {
  const sums = await db.select({
    proposalId: ledgerEntry.proposalId,
    baki: sql<number>`(coalesce(sum(${ledgerEntry.amount}) filter (where ${ledgerEntry.kind} = 'chukti'), 0)
      - coalesce(sum(${ledgerEntry.amount}) filter (where ${ledgerEntry.kind} = 'joma'), 0))::int`,
  }).from(ledgerEntry)
    .where(and(eq(ledgerEntry.ghotokId, ghotokId), sql`${ledgerEntry.proposalId} is not null`))
    .groupBy(ledgerEntry.proposalId);
  const owing = sums.filter((s) => s.baki > 0 && s.proposalId) as { proposalId: string; baki: number }[];
  if (!owing.length) return [];
  const rows = await db.query.proposal.findMany({
    where: and(eq(proposal.ghotokId, ghotokId), inArray(proposal.id, owing.map((o) => o.proposalId))),
    with: { patro: { columns: { name: true, guardianPhone: true } }, patri: { columns: { name: true, guardianPhone: true } } },
  });
  const byId = new Map(rows.map((r) => [r.id, r] as const));
  return owing.flatMap((o) => {
    const p = byId.get(o.proposalId);
    return p ? [{ proposalId: o.proposalId, patro: p.patro, patri: p.patri, baki: o.baki }] : [];
  }).sort((a, b) => b.baki - a.baki);
}

export interface Month {
  /** "YYYY-MM" */
  month: string;
  chukti: number;
  joma: number;
  khoroch: number;
  /** weddings that took place (a proposal moved to "biye_hoyeche") that month */
  weddings: number;
}

/** The last `n` months, oldest first, each with its money and weddings; months with nothing are kept as zeros. */
export async function monthly(db: Db, ghotokId: string, n = 6, now = today()): Promise<Month[]> {
  const [y, m] = now.split("-").map(Number);
  const months = Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const from = `${months[0]}-01`;
  const [money, weddings] = await Promise.all([
    db.select({ month: sql<string>`to_char(${ledgerEntry.entryDate}, 'YYYY-MM')`, kind: ledgerEntry.kind, amount: sql<number>`sum(${ledgerEntry.amount})::int` })
      .from(ledgerEntry).where(and(eq(ledgerEntry.ghotokId, ghotokId), gte(ledgerEntry.entryDate, from)))
      .groupBy(sql`1`, ledgerEntry.kind),
    db.select({ month: sql<string>`to_char(${proposalEvent.createdAt} at time zone 'Asia/Dhaka', 'YYYY-MM')`, n: sql<number>`count(*)::int` })
      .from(proposalEvent).innerJoin(proposal, eq(proposal.id, proposalEvent.proposalId))
      .where(and(eq(proposal.ghotokId, ghotokId), eq(proposalEvent.toStatus, "biye_hoyeche"), gte(proposalEvent.createdAt, new Date(`${from}T00:00:00+06:00`))))
      .groupBy(sql`1`),
  ]);
  return months.map((month) => {
    const row: Month = { month, chukti: 0, joma: 0, khoroch: 0, weddings: 0 };
    for (const r of money) if (r.month === month) row[r.kind] += r.amount;
    row.weddings = weddings.find((w) => w.month === month)?.n ?? 0;
    return row;
  });
}
