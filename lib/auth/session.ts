import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "../db";
import type { Role, Site } from "../db/schema";
import { getSite } from "../services/site";
import { getAuth } from "./index";
import { roleOf } from "./roles";

export interface SessionUser {
  id: string;
  name: string;
  /** 01XXXXXXXXX */
  phone: string;
  role: Role;
}

/** An admin, plus the id every service call is scoped to: the site owner's, whoever of the admins is signed in. */
export interface AdminSession extends SessionUser {
  ghotokId: string;
}

/** Where each role lands after signing in, and where it is sent when it opens the other side's screens. */
export const homeFor = (role: Role): string => (role === "admin" ? "/dashboard" : "/me");

/** The signed-in account, or null. Memoised for one render pass. */
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

/** The site row, read once per render pass; null until /setup has been completed. */
export const currentSite = cache((): Promise<Site | null> => getSite(getDb()));

/** Every screen but /setup itself: a deployment without its site row sends people to set it up. */
export async function requireSite(): Promise<Site> {
  const s = await currentSite();
  if (!s) redirect("/setup");
  return s;
}

/** Use at the top of every protected page, loader and action. Redirects to /login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** The ghotok's side (/dashboard, people, proposals, ledger) and its actions. A customer is sent to their own page. */
export async function requireAdmin(): Promise<AdminSession> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/me");
  const s = await requireSite();
  return { ...user, ghotokId: s.ghotokId };
}

/** The customer's side (/me). An admin who lands here is sent to the dashboard. */
export async function requireCustomer(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "admin") redirect("/dashboard");
  await requireSite();
  return user;
}
