import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { user, type Role } from "../db/schema";
import { normalizePhone } from "./phone";

// Who may open /admin. The role lives on the user row and is changed by another admin; ADMIN_PHONES in the
// environment (comma-separated numbers) makes those accounts admins without touching the database, which is how
// the first admin gets in.

/** Phone numbers from ADMIN_PHONES, normalised; anything that is not a number is dropped. */
export const adminPhones = (): string[] =>
  (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((s) => normalizePhone(s.trim()))
    .filter((p): p is string => Boolean(p));

/** The stored role, lifted to admin when the phone is listed in ADMIN_PHONES. */
export const effectiveRole = (role: Role, phone: string): Role =>
  role === "admin" || adminPhones().includes(phone) ? "admin" : "ghotok";

/** The effective role of one account, by id. An unknown id is a plain ghotok. */
export async function roleOf(db: Db, userId: string): Promise<Role> {
  const [row] = await db.select({ role: user.role, phone: user.username }).from(user).where(eq(user.id, userId));
  return row ? effectiveRole(row.role, row.phone ?? "") : "ghotok";
}
