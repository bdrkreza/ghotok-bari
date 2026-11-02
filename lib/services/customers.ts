import { randomInt } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, desc, eq, ilike, max, or } from "drizzle-orm";
import { effectiveRole } from "../auth/roles";
import type { AdminSession, SessionUser } from "../auth/session";
import type { Db } from "../db";
import { account, session, user, type Role } from "../db/schema";
import { AppError } from "../errors";

// Every account on the site, for the ghotok: who signed up, when they were last here, and who else is an admin.
// These read the user table across roles, so each function first checks the caller (the (ghotok) layout calls
// requireAdmin() as well; this is the second lock).

export function assertAdmin(who: SessionUser): void {
  if (who.role !== "admin") throw new AppError("forbidden");
}

export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  role: Role;
  /** the ghotok the site belongs to: always an admin, cannot be changed */
  owner: boolean;
  /** admin because of ADMIN_PHONES, which the page cannot undo */
  envAdmin: boolean;
  joined: Date;
  lastSeen: Date | null;
}

/** Every account, newest first. `q` matches the name or the phone number. */
export async function listCustomers(db: Db, who: AdminSession, q = ""): Promise<CustomerRow[]> {
  assertAdmin(who);
  const needle = q.trim();
  const like = `%${needle}%`;
  const [users, seen] = await Promise.all([
    db.select({ id: user.id, name: user.name, phone: user.username, role: user.role, joined: user.createdAt }).from(user)
      .where(needle ? or(ilike(user.name, like), ilike(user.username, like)) : undefined).orderBy(desc(user.createdAt)),
    db.select({ g: session.userId, at: max(session.updatedAt) }).from(session).groupBy(session.userId),
  ]);
  const lastSeen = new Map(seen.map((s) => [s.g, s.at] as const));
  return users.map((u) => {
    const phone = u.phone ?? "";
    const owner = u.id === who.ghotokId;
    const role = effectiveRole(u.role, phone, owner);
    return {
      id: u.id, name: u.name, phone, role, owner,
      envAdmin: !owner && role === "admin" && u.role !== "admin",
      joined: u.joined, lastSeen: lastSeen.get(u.id) ?? null,
    };
  });
}

/** Make an account an admin (a helper of the ghotok's), or a customer again. Nobody changes their own role, and the
 *  owner's cannot be changed at all, so the ghotok always keeps the site. */
export async function setRole(db: Db, who: AdminSession, userId: string, role: Role): Promise<void> {
  assertAdmin(who);
  if (userId === who.id) throw new AppError("self_role");
  if (userId === who.ghotokId) throw new AppError("owner_role");
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId));
  if (!row) throw new AppError("not_found");
  await db.update(user).set({ role }).where(eq(user.id, userId));
}

/**
 * A family forgot their password: the ghotok gives them a new one, read out over the phone. Returns the new password
 * (eight digits, easy to say) to show the ghotok once; it is stored only as a hash. Every session of that account
 * ends, so whoever had the old password is signed out. Not for one's own account (settings has "change password"),
 * and never the owner's.
 */
export async function resetPassword(db: Db, who: AdminSession, userId: string): Promise<string> {
  assertAdmin(who);
  if (userId === who.id) throw new AppError("self_role");
  if (userId === who.ghotokId) throw new AppError("owner_role");
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId));
  if (!row) throw new AppError("not_found");
  const password = String(randomInt(10_000_000, 100_000_000));
  const hash = await hashPassword(password);
  const updated = await db.update(account).set({ password: hash })
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential"))).returning({ id: account.id });
  if (!updated.length) throw new AppError("not_found");
  await db.delete(session).where(eq(session.userId, userId));
  return password;
}

/** One account's name, for the activity log. */
export async function accountName(db: Db, who: AdminSession, userId: string): Promise<string | null> {
  assertAdmin(who);
  const [row] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId));
  return row?.name ?? null;
}
