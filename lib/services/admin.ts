import { count, desc, eq, gte, ilike, inArray, max, or, sql } from "drizzle-orm";
import { effectiveRole } from "../auth/roles";
import type { SessionUser } from "../auth/session";
import type { Db } from "../db";
import { biodataShare, ledgerEntry, profile, proposal, session, user, type Role } from "../db/schema";
import { AppError } from "../errors";
import { LIVE } from "./proposals";

// The platform view for admins. Unlike every other service these read across ghotoks, so each function first checks
// the caller's role (pages call requireAdmin() as well; this is the second lock). They return counts and money
// totals per ghotok, never anyone's patro, patri or proposal details.

export function assertAdmin(who: SessionUser): void {
  if (who.role !== "admin") throw new AppError("forbidden");
}

export interface PlatformStats {
  ghotoks: number;
  /** signed up in the last 30 days */
  newGhotoks: number;
  /** people still looking */
  patro: number;
  patri: number;
  liveProposals: number;
  /** fixed or married */
  marriages: number;
  chukti: number;
  joma: number;
  /** biodata links currently switched on */
  shares: number;
}

export async function platformStats(db: Db, who: SessionUser): Promise<PlatformStats> {
  assertAdmin(who);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [[ghotoks], [fresh], people, [live], [married], money, [shares]] = await Promise.all([
    db.select({ n: count() }).from(user),
    db.select({ n: count() }).from(user).where(gte(user.createdAt, since)),
    db.select({ kind: profile.kind, n: count() }).from(profile).where(eq(profile.status, "active")).groupBy(profile.kind),
    db.select({ n: count() }).from(proposal).where(inArray(proposal.status, LIVE)),
    db.select({ n: count() }).from(proposal).where(inArray(proposal.status, ["thik_hoyeche", "biye_hoyeche"])),
    db.select({ kind: ledgerEntry.kind, total: sql<number>`coalesce(sum(${ledgerEntry.amount}), 0)::int` }).from(ledgerEntry).groupBy(ledgerEntry.kind),
    db.select({ n: count() }).from(biodataShare),
  ]);
  const total = (kind: string) => money.find((m) => m.kind === kind)?.total ?? 0;
  return {
    ghotoks: ghotoks?.n ?? 0,
    newGhotoks: fresh?.n ?? 0,
    patro: people.find((p) => p.kind === "patro")?.n ?? 0,
    patri: people.find((p) => p.kind === "patri")?.n ?? 0,
    liveProposals: live?.n ?? 0,
    marriages: married?.n ?? 0,
    chukti: total("chukti"),
    joma: total("joma"),
    shares: shares?.n ?? 0,
  };
}

export interface GhotokRow {
  id: string;
  name: string;
  phone: string;
  role: Role;
  /** admin because of ADMIN_PHONES, which /admin cannot undo */
  envAdmin: boolean;
  joined: Date;
  lastSeen: Date | null;
  profiles: number;
  proposals: number;
  marriages: number;
  joma: number;
}

/** Every account, newest first, with what each has in their ledger. `q` matches the name or the phone number. */
export async function listGhotoks(db: Db, who: SessionUser, q = ""): Promise<GhotokRow[]> {
  assertAdmin(who);
  const needle = q.trim();
  const like = `%${needle}%`;
  const [users, profiles, proposals, marriages, joma, seen] = await Promise.all([
    db.select({ id: user.id, name: user.name, phone: user.username, role: user.role, joined: user.createdAt }).from(user)
      .where(needle ? or(ilike(user.name, like), ilike(user.username, like)) : undefined).orderBy(desc(user.createdAt)),
    db.select({ g: profile.ghotokId, n: count() }).from(profile).groupBy(profile.ghotokId),
    db.select({ g: proposal.ghotokId, n: count() }).from(proposal).groupBy(proposal.ghotokId),
    db.select({ g: proposal.ghotokId, n: count() }).from(proposal).where(inArray(proposal.status, ["thik_hoyeche", "biye_hoyeche"])).groupBy(proposal.ghotokId),
    db.select({ g: ledgerEntry.ghotokId, total: sql<number>`coalesce(sum(${ledgerEntry.amount}), 0)::int` }).from(ledgerEntry)
      .where(eq(ledgerEntry.kind, "joma")).groupBy(ledgerEntry.ghotokId),
    db.select({ g: session.userId, at: max(session.updatedAt) }).from(session).groupBy(session.userId),
  ]);
  const by = <T extends { g: string }>(rows: T[]) => new Map(rows.map((r) => [r.g, r] as const));
  const [pr, pp, pm, pj, ps] = [by(profiles), by(proposals), by(marriages), by(joma), by(seen)];
  return users.map((u) => {
    const phone = u.phone ?? "";
    const role = effectiveRole(u.role, phone);
    return {
      id: u.id, name: u.name, phone, role, envAdmin: role === "admin" && u.role !== "admin", joined: u.joined,
      lastSeen: ps.get(u.id)?.at ?? null,
      profiles: pr.get(u.id)?.n ?? 0, proposals: pp.get(u.id)?.n ?? 0, marriages: pm.get(u.id)?.n ?? 0, joma: pj.get(u.id)?.total ?? 0,
    };
  });
}

/** Make someone an admin, or a plain ghotok again. Admins cannot change their own role, so there is always one left. */
export async function setRole(db: Db, who: SessionUser, userId: string, role: Role): Promise<void> {
  assertAdmin(who);
  if (userId === who.id) throw new AppError("self_role");
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId));
  if (!row) throw new AppError("not_found");
  await db.update(user).set({ role }).where(eq(user.id, userId));
}
