import Link from "next/link";
import { Bell } from "./_components/bell";
import { Nav, TopNav } from "./_components/nav";
import { Logo } from "@/components/logo";
import { homeFor, requireSite, requireUser, type SessionUser } from "@/lib/auth/session";
import { adminItems, noticeItem, type BellItem } from "@/lib/bell";
import { getDb } from "@/lib/db";
import type { Site } from "@/lib/db/schema";
import type { T } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { alerts } from "@/lib/services/dashboard";
import { recentNotices, unreadCount } from "@/lib/services/notices";

/** Every signed-in screen, for both roles. Phone: a slim top bar, the page, and the tab bar along the bottom.
 *  Wide screen (lg, 1024px and up): a bar across the top with the role's screens and who is signed in, and a wider page; no tab bar. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [user, site, T] = await Promise.all([requireUser(), requireSite(), getT()]);
  const { t } = T;
  const { badges, ...bell } = await bellFor(user, site, T);
  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav userName={user.name} role={user.role} siteName={site.name} badges={badges} bell={<Bell {...bell} className="my-auto shrink-0" />} />
      {/* the palki's arch: maroon, its foot curved. Only the name and the bell, so the name has room; the
          language, the theme and the rest are one tab away on the settings screen */}
      <header className="sticky top-0 z-10 rounded-b-[50%_1.4rem] bg-panel pb-4 text-on-panel shadow-md lg:hidden print:hidden">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4">
          <Link href={homeFor(user.role)} className="flex min-w-0 items-center gap-2.5">
            <Logo tone="panel" className="size-8 shrink-0 rounded-xl outline-2 outline-offset-3 outline-gold outline-dotted" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-display text-base font-extrabold">{site.name}</span>
              <span className="truncate text-[11px] font-medium text-gold">{user.role === "admin" ? t("nav.ghotokDashboard") : t("nav.trusted")}</span>
            </span>
          </Link>
          <Bell {...bell} tone="panel" className="shrink-0" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:max-w-6xl lg:gap-6 lg:px-8 lg:py-8 print:max-w-none print:gap-0 print:p-0">
        {children}
      </main>
      <Nav role={user.role} badges={badges} />
    </div>
  );
}

/**
 * What the bell shows. The ghotok's side: what waits for a decision or a call, one line per kind with its count. A
 * family: the news on their biodata and requests (lib/services/notices.ts), newest first. badges: the same counts by
 * screen, for the ghotok's wheel on the phone bar.
 */
async function bellFor(user: SessionUser, site: Site, T: T): Promise<{ items: BellItem[]; count: number; family: boolean; badges: Record<string, number> }> {
  const db = getDb();
  if (user.role === "admin") {
    const a = await alerts(db, site.ghotokId);
    return {
      items: adminItems(a, T), count: a.pending + a.interests + a.followUps + a.meetings, family: false,
      badges: { "/dashboard/approvals": a.pending, "/dashboard/interests": a.interests, "/dashboard/meetings": a.meetings },
    };
  }
  // the list holds the latest fifty, seen and unseen, and scrolls; the badge counts every unseen one
  const [notices, unread] = await Promise.all([recentNotices(db, site.ghotokId, user.id, 50), unreadCount(db, site.ghotokId, user.id)]);
  return { items: notices.map((n) => noticeItem(n, user.id, T)), count: unread, family: true, badges: {} };
}
