import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuth } from "./index";

export interface SessionUser {
  id: string;
  name: string;
  /** 01XXXXXXXXX */
  phone: string;
}

/** The signed-in ghotok, or null. Memoised for one render pass. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Read the request first: it marks the page as dynamic, so a build never tries to prerender it.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const u = session.user as typeof session.user & { username?: string | null };
  return { id: u.id, name: u.name, phone: u.username ?? "" };
});

/** Use at the top of every protected page, loader and action. Redirects to /login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
