"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { initials } from "@/lib/bn";
import type { Role } from "@/lib/db/schema";
import type { Key } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { Icon, type IconName } from "./icons";
import { LangSwitch } from "./lang-switch";
import { ThemeButton } from "./theme";

interface Tab {
  href: string;
  label: Key;
  icon: IconName;
  /** lit only on this exact address, not on the screens under it */
  exact?: boolean;
}

/** The ghotok's everyday screens. */
const GHOTOK_TABS: Tab[] = [
  { href: "/dashboard", label: "nav.home", icon: "home", exact: true },
  { href: "/patro", label: "kind.patro", icon: "groom" },
  { href: "/patri", label: "kind.patri", icon: "bride" },
  { href: "/proposals", label: "nav.proposals", icon: "rings" },
  { href: "/hisab", label: "nav.ledger", icon: "wallet" },
];

/** Only on the wide bar, where there is room: the biodata requests and the accounts screen. */
const GHOTOK_MORE: Tab[] = [
  { href: "/dashboard/approvals", label: "nav.requests", icon: "note" },
  { href: "/dashboard/customers", label: "nav.customers", icon: "people" },
];

/** A family's screens. */
const CUSTOMER_TABS: Tab[] = [
  { href: "/me", label: "nav.home", icon: "home" },
  { href: "/patro", label: "kind.patro", icon: "groom" },
  { href: "/patri", label: "kind.patri", icon: "bride" },
  { href: "/settings", label: "nav.settings", icon: "settings" },
];

const tabsFor = (role: Role) => (role === "admin" ? GHOTOK_TABS : CUSTOMER_TABS);

/** Is this screen, or one of its sub-screens, the current one? */
function useActive() {
  const pathname = usePathname();
  return (t: Pick<Tab, "href" | "exact">) => (t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`));
}

/** Phone: bottom tab bar, the role's screens one thumb away. Hidden on wide screens, where TopNav takes over. */
export function Nav({ role }: { role: Role }) {
  const active = useActive();
  const { t } = useT();
  return (
    <nav aria-label={t("nav.main")} className="henna-edge henna-edge-t fixed inset-x-0 bottom-0 z-20 bg-surface/95 pt-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-md">
        {tabsFor(role).map((tab) => {
          const on = active(tab);
          return (
            <li key={tab.href} className="flex-1">
              <Link href={tab.href} aria-current={on ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${on ? "text-primary" : "text-muted"}`}>
                <Icon name={tab.icon} size={22} strokeWidth={on ? 2.3 : 1.9} />
                {t(tab.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Web: a bar across the top with the site's name, the role's screens and who is signed in (opens settings). Only on wide screens (lg). */
export function TopNav({ userName, role, siteName }: { userName: string; role: Role; siteName: string }) {
  const active = useActive();
  const { t } = useT();
  const settingsOn = active({ href: "/settings" });
  const tabs = role === "admin" ? [...GHOTOK_TABS, ...GHOTOK_MORE] : CUSTOMER_TABS.filter((tab) => tab.href !== "/settings");
  return (
    <header className="henna-edge sticky top-0 z-20 hidden bg-surface/95 pb-2.5 backdrop-blur lg:block">
      <div className="mx-auto flex h-18 max-w-6xl items-stretch gap-4 px-8">
        {/* the name never shrinks away; with seven tabs and the switches, the tab row scrolls instead */}
        <Link href={role === "admin" ? "/dashboard" : "/me"} className="flex shrink-0 items-center gap-2.5">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary font-display text-lg font-extrabold text-on-primary outline-2 outline-offset-3 outline-primary outline-dotted">ঘ</span>
          <span className="flex flex-col leading-tight">
            <span className="max-w-44 truncate font-display text-lg font-extrabold xl:max-w-56">{siteName}</span>
            <span className="text-xs text-muted">{role === "admin" ? t("nav.ghotokDashboard") : t("nav.trusted")}</span>
          </span>
        </Link>
        <nav aria-label={t("nav.main")} className="flex min-w-0 flex-1 items-stretch gap-0.5 overflow-x-auto">
          {tabs.map((tab) => {
            const on = active(tab);
            return (
              <Link key={tab.href} href={tab.href} aria-current={on ? "page" : undefined}
                className={`flex shrink-0 items-center border-b-2 px-3 font-bold ${on ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}>
                {t(tab.label)}
              </Link>
            );
          })}
        </nav>
        <LangSwitch className="my-auto shrink-0" />
        <ThemeButton className="my-auto" />
        {/* the ghotok's bar carries seven tabs, so their pill is initials only (the name is in the label); a family's bar has room for the name */}
        <Link href="/settings" aria-current={settingsOn ? "page" : undefined} aria-label={t("nav.settingsFor", { name: userName })} title={userName}
          className={`my-auto flex shrink-0 items-center gap-2.5 rounded-full border p-1 text-sm font-bold ${role === "admin" ? "" : "pr-4"} ${settingsOn ? "border-primary bg-primary-soft text-primary" : "border-line hover:bg-sunk"}`}>
          <span aria-hidden className="grid size-9 place-items-center rounded-full bg-primary-soft text-sm text-primary">{initials(userName)}</span>
          {role === "admin" ? null : <span className="max-w-36 truncate">{userName}</span>}
        </Link>
      </div>
    </header>
  );
}
