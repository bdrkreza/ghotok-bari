"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { initials } from "@/lib/bn";
import { Icon, type IconName } from "./icons";
import { ThemeButton } from "./theme";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "হোম", icon: "home" },
  { href: "/patro", label: "পাত্র", icon: "groom" },
  { href: "/patri", label: "পাত্রী", icon: "bride" },
  { href: "/proposals", label: "প্রস্তাব", icon: "rings" },
  { href: "/hisab", label: "হিসাব", icon: "wallet" },
];

/** Is this screen, or one of its sub-screens, the current one? */
function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
}

/** Phone: bottom tab bar, the five everyday screens one thumb away. Hidden on wide screens, where TopNav takes over. */
export function Nav() {
  const active = useActive();
  return (
    <nav aria-label="প্রধান" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const on = active(t.href);
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

/** Web: a bar across the top with the mark, the same five screens and who is signed in (opens settings). Only on wide screens (lg). */
export function TopNav({ userName, admin = false }: { userName: string; admin?: boolean }) {
  const active = useActive();
  const settingsOn = active("/settings");
  return (
    <header className="sticky top-0 z-20 hidden border-b border-line bg-surface/95 backdrop-blur lg:block">
      <div className="mx-auto flex h-18 max-w-6xl items-stretch gap-8 px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-primary font-display text-lg font-extrabold text-on-primary">আ</span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-extrabold">আলতা</span>
            <span className="text-xs text-muted">বিশ্বস্ত ঘটকালির খাতা</span>
          </span>
        </Link>
        <nav aria-label="প্রধান" className="flex flex-1 items-stretch gap-1">
          {TABS.map((t) => {
            const on = active(t.href);
            return (
              <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
                className={`flex items-center border-b-2 px-3.5 font-bold ${on ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}>
                {t.label}
              </Link>
            );
          })}
          {admin ? (
            <Link href="/admin" aria-current={active("/admin") ? "page" : undefined}
              className={`flex items-center gap-1.5 border-b-2 px-3.5 font-bold ${active("/admin") ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}>
              <Icon name="shield" size={18} />অ্যাডমিন
            </Link>
          ) : null}
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
