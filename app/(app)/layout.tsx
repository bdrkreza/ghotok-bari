import Link from "next/link";
import { Bell, type BellItem } from "./_components/bell";
import { Nav, TopNav } from "./_components/nav";
import { homeFor, requireSite, requireUser, type SessionUser } from "@/lib/auth/session";
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
      <TopNav userName={user.name} role={user.role} siteName={site.name} bell={<Bell {...bell} className="my-auto shrink-0" />} />
      {/* the palki's arch: maroon, its foot curved. Only the name and the bell, so the name has room; the
          language, the theme and the rest are one tab away on the settings screen */}
      <header className="sticky top-0 z-10 rounded-b-[50%_1.4rem] bg-panel pb-4 text-on-panel shadow-md lg:hidden print:hidden">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4">
          <Link href={homeFor(user.role)} className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-xl bg-on-panel font-display text-base font-extrabold text-panel outline-2 outline-offset-3 outline-gold outline-dotted">ঘ</span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-display text-base font-extrabold">{site.name}</span>
              <span className="truncate text-[11px] font-medium text-gold">{user.role === "admin" ? t("nav.ghotokDashboard") : t("nav.trusted")}</span>
            </span>
          </Link>
          <Bell {...bell} tone="panel" className="shrink-0" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:max-w-6xl lg:gap-6 lg:px-8 lg:py-8">
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
  const { t } = T;
  const db = getDb();
  if (user.role === "admin") {
    const a = await alerts(db, site.ghotokId);
    const items: BellItem[] = [
      ...(a.pending ? [{ key: "pending", text: t("dash.pendingBanner", { n: a.pending }), sub: t("dash.pendingBannerText"), href: "/dashboard/approvals", icon: "note" as const, tone: "warn" as const }] : []),
      ...(a.interests ? [{ key: "interests", text: t("dash.interestBanner", { n: a.interests }), sub: t("dash.interestBannerText"), href: "/dashboard/interests", icon: "heart" as const, tone: "news" as const }] : []),
      ...(a.followUps ? [{ key: "followUps", text: t("dash.followUpTitle", { n: a.followUps }), sub: t("bell.followUpSub"), href: "/dashboard#followups", icon: "calendar" as const, tone: "warn" as const }] : []),
    ];
    return {
      items, count: a.pending + a.interests + a.followUps, family: false,
      badges: { "/dashboard/approvals": a.pending, "/dashboard/interests": a.interests },
    };
  }
  // the list holds the latest fifty, seen and unseen, and scrolls; the badge counts every unseen one
  const [notices, unread] = await Promise.all([recentNotices(db, site.ghotokId, user.id, 50), unreadCount(db, site.ghotokId, user.id)]);
  const items: BellItem[] = notices.map((n) => {
    const no = n.profileKind && n.profileCode !== null ? T.biodataNo(n.profileKind, n.profileCode) : "";
    return {
      key: n.id,
      text: t(`me.notice.${n.kind}`, { no }),
      sub: n.note ? t("me.ghotokNote", { note: n.note }) : T.date(n.createdAt),
      // their own biodata opens on their side; one they asked about, on the list side
      href: n.profileId ? (n.ownedBy === user.id ? `/me/biodata/${n.profileId}` : `/biodata/${n.profileId}`) : "/me",
      icon: n.kind === "approved" ? "check" : n.kind === "proposed" ? "rings" : "note",
      tone: n.kind === "returned" ? "warn" : "news",
      seen: n.readAt !== null,
      noticeId: n.id,
    };
  });
  return { items, count: unread, family: true, badges: {} };
}
