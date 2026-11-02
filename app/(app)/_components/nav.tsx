"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { initials } from "@/lib/bn";
import type { Role } from "@/lib/db/schema";
import type { Key } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { Icon, type IconName } from "@/components/icons";
import { LangSwitch } from "@/components/lang-switch";
import { ThemeButton } from "@/components/theme";
import { MoreWheel } from "./more-wheel";

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
  { href: "/dashboard/interests", label: "nav.interests", icon: "heart" },
  { href: "/dashboard/customers", label: "nav.customers", icon: "people" },
];

/** A family's screens. */
const CUSTOMER_TABS: Tab[] = [
  { href: "/me", label: "nav.home", icon: "home" },
  { href: "/patro", label: "kind.patro", icon: "groom" },
  { href: "/patri", label: "kind.patri", icon: "bride" },
  { href: "/settings", label: "nav.settings", icon: "settings" },
];

const SETTINGS: Tab = { href: "/settings", label: "nav.settings", icon: "settings" };

/** The ghotok on a phone: four tabs, and the rest behind the raised "আরও" button in the middle. */
const GHOTOK_PHONE = GHOTOK_TABS.filter((tab) => tab.href !== "/hisab");
const GHOTOK_SHEET: Tab[] = [...GHOTOK_TABS.filter((tab) => tab.href === "/hisab"), ...GHOTOK_MORE, SETTINGS];

const tabsFor = (role: Role) => (role === "admin" ? GHOTOK_PHONE : CUSTOMER_TABS);

/** Is this screen, or one of its sub-screens, the current one? */
function useActive() {
  const pathname = usePathname();
  return (t: Pick<Tab, "href" | "exact">) => (t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`));
}

/** Phone: bottom tab bar, the role's screens one thumb away. Hidden on wide screens, where TopNav takes over.
 *  The middle is a raised round button: a family hands in a biodata there; the ghotok turns a wheel of the screens that
 *  do not fit (more-wheel.tsx). badges: what is new, by address, shown on those screens' buttons. */
export function Nav({ role, badges = {} }: { role: Role; badges?: Record<string, number> }) {
  const active = useActive();
  const { t } = useT();
  const tabs = tabsFor(role).map((tab) => {
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
  });
  if (role === "admin") {
    const items = GHOTOK_SHEET.map((tab) => ({ href: tab.href, label: t(tab.label), icon: tab.icon, on: active(tab), badge: badges[tab.href] ?? 0 }));
    tabs.splice(2, 0, <MoreWheel key="more" items={items} />);
  } else {
    const on = active({ href: "/me/biodata/new" });
    tabs.splice(2, 0, (
      <li key="add" className="flex flex-1 justify-center">
        <Link href="/me/biodata/new" aria-current={on ? "page" : undefined} aria-label={t("me.submit")}
          className="flex flex-col items-center gap-0.5 text-[11px] font-bold text-primary">
          <span aria-hidden className="-mt-7 grid size-14 place-items-center rounded-full border-[5px] border-bg bg-primary text-on-primary shadow-lg">
            <Icon name="plus" size={24} strokeWidth={2.4} />
          </span>
          {t("nav.addBiodata")}
        </Link>
      </li>
    ));
  }
  return (
    <nav aria-label={t("nav.main")} className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pt-1 pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden">
      <ul className="mx-auto flex max-w-md">{tabs}</ul>
    </nav>
  );
}

/** Web: a bar across the top with the site's name, the role's screens and who is signed in (opens settings). Only on wide screens (lg). */
export function TopNav({ userName, role, siteName, bell }: { userName: string; role: Role; siteName: string; bell?: ReactNode }) {
  const active = useActive();
  const { t } = useT();
  const settingsOn = active({ href: "/settings" });
  const tabs = role === "admin" ? [...GHOTOK_TABS, ...GHOTOK_MORE] : CUSTOMER_TABS.filter((tab) => tab.href !== "/settings");
  return (
    <header className="henna-edge sticky top-0 z-20 hidden bg-surface/95 pb-2.5 backdrop-blur lg:block print:hidden">
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
        {bell}
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
