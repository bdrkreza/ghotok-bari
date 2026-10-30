import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "../db";
import type { Role } from "../db/schema";
import { getAuth } from "./index";
import { roleOf } from "./roles";

export interface SessionUser {
  id: string;
  name: string;
  /** 01XXXXXXXXX */
  phone: string;
  role: Role;
}

/** The signed-in ghotok, or null. Memoised for one render pass. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Read the request first: it marks the page as dynamic, so a build never tries to prerender it.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const u = session.user as typeof session.user & { username?: string | null };
  // the role comes from our own user row: Better Auth only hands back the columns it knows about
  const role = await roleOf(getDb(), u.id);
  return { id: u.id, name: u.name, phone: u.username ?? "", role };
});

/** Use at the top of every protected page, loader and action. Redirects to /login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** For /admin and its actions. A signed-in ghotok who is not an admin is sent to their own dashboard. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
