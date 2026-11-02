import { currentSite, getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import type { Key } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { logActivity } from "@/lib/services/activity";
import { exportAll, peopleCsv } from "@/lib/services/backup";
import { today } from "@/lib/time";

/**
 * The ghotok's copy of the site, from settings: `?format=json` (everything, to keep) or `?format=csv` (everyone on
 * file, for Excel). Admins only; anyone else gets the same 404 as an unknown address.
 */
export async function GET(request: Request) {
  const [user, site] = await Promise.all([getSessionUser(), currentSite()]);
  if (!user || !site || user.role !== "admin") return new Response("Not found", { status: 404 });
  const db = getDb();
  const csv = new URL(request.url).searchParams.get("format") === "csv";
  await logActivity(db, site.ghotokId, user.id, "backup", csv ? "CSV" : "JSON");
  const name = `alta-${today()}`;
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (csv) {
    const { t } = await getT();
    const body = await peopleCsv(db, site.ghotokId, (column) => t(`csv.${column}` as Key));
    return new Response(body, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}-people.csv"` } });
  }
  const body = JSON.stringify(await exportAll(db, site.ghotokId), null, 2);
  return new Response(body, { headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.json"` } });
}
