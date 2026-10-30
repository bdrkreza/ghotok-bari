import { headers } from "next/headers";

/** The site's own origin, for links handed outside (share links): BETTER_AUTH_URL when set, else the request's host. */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.BETTER_AUTH_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
