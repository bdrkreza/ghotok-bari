"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { initials } from "@/lib/bn";
import type { Role } from "@/lib/db/schema";
import { Icon, type IconName } from "./icons";
import { ThemeButton } from "./theme";

interface Tab {
  href: string;
  label: string;
  icon: IconName;
  /** lit only on this exact address, not on the screens under it */
  exact?: boolean;
}

/** The ghotok's everyday screens. */
const GHOTOK_TABS: Tab[] = [
  { href: "/dashboard", label: "হোম", icon: "home", exact: true },
  { href: "/patro", label: "পাত্র", icon: "groom" },
  { href: "/patri", label: "পাত্রী", icon: "bride" },
  { href: "/proposals", label: "প্রস্তাব", icon: "rings" },
  { href: "/hisab", label: "হিসাব", icon: "wallet" },
];

/** Only on the wide bar, where there is room: the accounts screen. */
const GHOTOK_MORE: Tab[] = [{ href: "/dashboard/customers", label: "গ্রাহক", icon: "people" }];

/** A family's screens; the biodata lists join these once families can see them. */
const CUSTOMER_TABS: Tab[] = [
  { href: "/me", label: "হোম", icon: "home" },
  { href: "/settings", label: "সেটিংস", icon: "settings" },
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
  return (
    <nav aria-label="প্রধান" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto flex max-w-md">
        {tabsFor(role).map((t) => {
          const on = active(t);
          return (
            <li key={t.href} className="flex-1">
              <Link href={t.href} aria-current={on ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${on ? "text-primary" : "text-muted"}`}>
                <Icon name={t.icon} size={22} strokeWidth={on ? 2.3 : 1.9} />
                {t.label}
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
  const settingsOn = active({ href: "/settings" });
  const tabs = role === "admin" ? [...GHOTOK_TABS, ...GHOTOK_MORE] : CUSTOMER_TABS.filter((t) => t.href !== "/settings");
  return (
    <header className="sticky top-0 z-20 hidden border-b border-line bg-surface/95 backdrop-blur lg:block">
      <div className="mx-auto flex h-18 max-w-6xl items-stretch gap-8 px-8">
        <Link href={role === "admin" ? "/dashboard" : "/me"} className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary font-display text-lg font-extrabold text-on-primary">ঘ</span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="max-w-56 truncate font-display text-lg font-extrabold">{siteName}</span>
            <span className="text-xs text-muted">{role === "admin" ? "ঘটকের ড্যাশবোর্ড" : "বিশ্বস্ত ঘটকালি"}</span>
          </span>
        </Link>
        <nav aria-label="প্রধান" className="flex flex-1 items-stretch gap-1">
          {tabs.map((t) => {
            const on = active(t);
            return (
              <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
                className={`flex items-center border-b-2 px-3.5 font-bold ${on ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}>
                {t.label}
              </Link>
            );
          })}
        </nav>
        <ThemeButton className="my-auto" />
        <Link href="/settings" aria-current={settingsOn ? "page" : undefined}
          className={`my-auto flex items-center gap-2.5 rounded-full border py-1 pr-4 pl-1 text-sm font-bold ${settingsOn ? "border-primary bg-primary-soft text-primary" : "border-line hover:bg-sunk"}`}>
          <span aria-hidden className="grid size-9 place-items-center rounded-full bg-primary-soft text-sm text-primary">{initials(userName)}</span>
          <span className="max-w-40 truncate">{userName}</span>
        </Link>
      </div>
    </header>
  );
}
