import { currentSite, getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { photoFor } from "@/lib/services/photos";

/**
 * One photo of a person, for someone allowed to see it (lib/services/photos.ts: the ghotok's side, or the family who
 * wrote that biodata). Anyone else, signed in or not, gets the same 404, so a photo id says nothing about who exists.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/photos/[id]">) {
  const [user, site] = await Promise.all([getSessionUser(), currentSite()]);
  if (!user || !site) return new Response("Not found", { status: 404 });
  const { id } = await ctx.params;
  const photo = await photoFor(getDb(), { userId: user.id, role: user.role, ghotokId: site.ghotokId }, id);
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(photo.bytes as BodyInit, {
    headers: {
      "Content-Type": photo.contentType,
      // a photo's id never points at another file, so the browser may keep it; "private" keeps it out of shared caches
      "Cache-Control": "private, max-age=604800, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
