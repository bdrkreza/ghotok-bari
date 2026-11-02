import { currentSite, getSessionUser } from "@/lib/auth/session";
import { adminItems, noticeItem } from "@/lib/bell";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { alerts } from "@/lib/services/dashboard";
import { unreadNotices } from "@/lib/services/notices";

/**
 * What the phone's notification says. A push arrives empty (lib/push.ts); the service worker (public/sw.js) asks
 * here with the reader's own cookie and shows the answer: a family's newest unread notice, or the ghotok's waiting
 * list, in the language they chose. Signed out, it says only that there is news.
 */
export async function GET() {
  const [user, site, T] = await Promise.all([getSessionUser(), currentSite(), getT()]);
  const headers = { "Cache-Control": "no-store" };
  const title = site?.name ?? T.t("push.title");
  if (!user || !site) return Response.json({ title, body: T.t("push.fallback"), url: "/login" }, { headers });
  const db = getDb();
  if (user.role === "admin") {
    const items = adminItems(await alerts(db, site.ghotokId), T);
    return Response.json({ title, body: items.map((it) => it.text).join("\n") || T.t("push.fallback"), url: items[0]?.href ?? "/dashboard" }, { headers });
  }
  const [newest] = await unreadNotices(db, site.ghotokId, user.id, 1);
  if (!newest) return Response.json({ title, body: T.t("push.fallback"), url: "/me" }, { headers });
  const item = noticeItem(newest, user.id, T);
  return Response.json({ title, body: item.sub ? `${item.text}\n${item.sub}` : item.text, url: item.href }, { headers });
}
