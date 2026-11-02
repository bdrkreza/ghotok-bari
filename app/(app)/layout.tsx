import Link from "next/link";
import { Icon } from "@/components/icons";
import { LangSwitch } from "@/components/lang-switch";
import { Bell, type BellItem } from "./_components/bell";
import { Nav, TopNav } from "./_components/nav";
import { ThemeButton } from "@/components/theme";
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
  const bell = await bellFor(user, site, T);
  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav userName={user.name} role={user.role} siteName={site.name} bell={<Bell {...bell} className="my-auto shrink-0" />} />
      <header className="henna-edge sticky top-0 z-10 bg-bg/90 pb-2.5 backdrop-blur lg:hidden print:hidden">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4">
          <Link href={homeFor(user.role)} className="flex min-w-0 items-center gap-2 font-display text-lg font-extrabold">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-base text-on-primary outline-2 outline-offset-3 outline-primary outline-dotted">ঘ</span>
            <span className="truncate">{site.name}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <LangSwitch />
            <ThemeButton />
            <Bell {...bell} />
            <Link href="/settings" aria-label={t("nav.settingsFor", { name: user.name })} className="grid size-10 place-items-center rounded-full border border-line text-muted">
              <Icon name="settings" size={20} />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:max-w-6xl lg:gap-6 lg:px-8 lg:py-8">
        {children}
      </main>
      <Nav role={user.role} />
    </div>
  );
}

/**
 * What the bell shows. The ghotok's side: what waits for a decision or a call, one line per kind with its count. A
 * family: the news on their biodata and requests (lib/services/notices.ts), newest first.
 */
async function bellFor(user: SessionUser, site: Site, T: T): Promise<{ items: BellItem[]; count: number; family: boolean }> {
  const { t } = T;
  const db = getDb();
  if (user.role === "admin") {
    const a = await alerts(db, site.ghotokId);
    const items: BellItem[] = [
      ...(a.pending ? [{ key: "pending", text: t("dash.pendingBanner", { n: a.pending }), sub: t("dash.pendingBannerText"), href: "/dashboard/approvals", icon: "note" as const, tone: "warn" as const }] : []),
      ...(a.interests ? [{ key: "interests", text: t("dash.interestBanner", { n: a.interests }), sub: t("dash.interestBannerText"), href: "/dashboard/interests", icon: "heart" as const, tone: "news" as const }] : []),
      ...(a.followUps ? [{ key: "followUps", text: t("dash.followUpTitle", { n: a.followUps }), sub: t("bell.followUpSub"), href: "/dashboard#followups", icon: "calendar" as const, tone: "warn" as const }] : []),
    ];
    return { items, count: a.pending + a.interests + a.followUps, family: false };
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
  return { items, count: unread, family: true };
}
