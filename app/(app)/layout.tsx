import Link from "next/link";
import { Icon } from "@/components/icons";
import { LangSwitch } from "@/components/lang-switch";
import { Nav, TopNav } from "@/components/nav";
import { ThemeButton } from "@/components/theme";
import { homeFor, requireSite, requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

/** Every signed-in screen, for both roles. Phone: a slim top bar, the page, and the tab bar along the bottom.
 *  Wide screen (lg, 1024px and up): a bar across the top with the role's screens and who is signed in, and a wider page; no tab bar. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [user, site, { t }] = await Promise.all([requireUser(), requireSite(), getT()]);
  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav userName={user.name} role={user.role} siteName={site.name} />
      <header className="henna-edge sticky top-0 z-10 bg-bg/90 pb-2.5 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4">
          <Link href={homeFor(user.role)} className="flex min-w-0 items-center gap-2 font-display text-lg font-extrabold">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-base text-on-primary outline-2 outline-offset-3 outline-primary outline-dotted">ঘ</span>
            <span className="truncate">{site.name}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <LangSwitch />
            <ThemeButton />
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
