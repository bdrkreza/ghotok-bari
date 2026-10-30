"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { Icon, type IconName } from "./icons";
import { Card } from "./ui";
import { THEMES, THEME_KEY, applyTheme, isTheme, type Theme } from "@/lib/theme";

// One store for every control on the page, so the settings card and the bar button never disagree.
const listeners = new Set<() => void>();

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isTheme(v) ? v : "system";
  } catch {
    return "system";
  }
}

function writeTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode or blocked storage: the choice lasts for this page only */
  }
  applyTheme(theme);
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  // changed in another tab: follow it here too
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY || e.key === null) { applyTheme(readTheme()); cb(); }
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
};

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");
const subscribeSystem = (cb: () => void) => {
  const mq = darkQuery();
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** The saved choice (null on the server and during hydration) and whether the screen is dark right now. */
function useTheme() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, readTheme, () => null);
  const systemDark = useSyncExternalStore(subscribeSystem, () => darkQuery().matches, () => false);
  const dark = theme === "dark" || (theme === "system" && systemDark);
  return { theme, dark, setTheme: writeTheme };
}

/**
 * Mounted once in the root layout: re-applies the saved choice after hydration and after each navigation, since
 * React puts its own theme-color metas back at the top of <head> at those moments. Renders nothing.
 */
export function ThemeSync() {
  const pathname = usePathname();
  useEffect(() => { applyTheme(readTheme()); }, [pathname]);
  return null;
}

/** One tap between light and dark, for the bars. The icon is the scheme it would switch to. */
export function ThemeButton({ className = "" }: { className?: string }) {
  const { dark, setTheme } = useTheme();
  const label = dark ? "আলো মোড" : "অন্ধকার মোড";
  return (
    <button
      type="button" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={label} title={label}
      className={`grid size-10 shrink-0 place-items-center rounded-full border border-line text-muted hover:bg-sunk hover:text-ink ${className}`}
    >
      <Icon name={dark ? "sun" : "moon"} size={20} />
    </button>
  );
}

const ICONS: Record<Theme, IconName> = { system: "monitor", light: "sun", dark: "moon" };

/** Settings card: follow the phone, or fix light or dark on this device. */
export function ThemeCard() {
  const { theme, setTheme } = useTheme();
  return (
    <Card title="থিম: আলো বা অন্ধকার">
      <p className="text-sm text-muted">সাধারণত ফোনের সেটিং অনুযায়ী বদলায়। এখানে বেছে দিলে এই ডিভাইসে সেটাই থাকবে।</p>
      <div role="radiogroup" aria-label="থিম" className="grid grid-cols-3 gap-2">
        {THEMES.map((t) => {
          const on = theme === t.value;
          return (
            <button key={t.value} type="button" role="radio" aria-checked={on} onClick={() => setTheme(t.value)}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-sm font-bold sm:flex-row sm:gap-2 sm:px-3 ${on ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-muted"}`}>
              <Icon name={ICONS[t.value]} size={18} />{t.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
