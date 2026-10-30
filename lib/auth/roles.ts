import { eq, sql } from "drizzle-orm";
import type { Db } from "../db";
import { site, user, type Role } from "../db/schema";
import { normalizePhone } from "./phone";

// Who runs the site. The role lives on the user row and is changed by an admin from /dashboard/customers. Two
// accounts are admins whatever the row says: the site's owner (site.ghotok_id, set at /setup) and any number listed
// in ADMIN_PHONES in the environment, which is the developer's way back in if the ghotok ever loses access.

/** Phone numbers from ADMIN_PHONES, normalised; anything that is not a number is dropped. */
export const adminPhones = (): string[] =>
  (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((s) => normalizePhone(s.trim()))
    .filter((p): p is string => Boolean(p));

/** The stored role, lifted to admin for the site's owner and for a phone listed in ADMIN_PHONES. */
export const effectiveRole = (role: Role, phone: string, owner = false): Role =>
  owner || role === "admin" || adminPhones().includes(phone) ? "admin" : "customer";

/** The effective role of one account, by id. An unknown id is a plain customer. */
export async function roleOf(db: Db, userId: string): Promise<Role> {
  const [row] = await db
    .select({
      role: user.role,
      phone: user.username,
      // written out in full: inside the subquery a bare "id" would be the site's, not the user's
      owner: sql<boolean>`exists (select 1 from ${site} where "site"."ghotok_id" = "user"."id")`,
    })
    .from(user)
    .where(eq(user.id, userId));
  return row ? effectiveRole(row.role, row.phone ?? "", row.owner) : "customer";
}
