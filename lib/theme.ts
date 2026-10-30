// Light or dark on this device. The default follows the phone (prefers-color-scheme); a choice made in settings
// is kept in localStorage and applied as data-theme on <html>, which globals.css reads. Nothing is stored on the
// server: the same ghotok may want dark on the phone and light on the shop computer.

export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "alta-theme";

/** The page background of each scheme, also pushed into the browser's bar (theme-color). */
export const THEME_COLORS = { light: "#f8f6f3", dark: "#14161d" } as const;

export const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "ফোনের মতো" },
  { value: "light", label: "আলো" },
  { value: "dark", label: "অন্ধকার" },
];

export const isTheme = (v: unknown): v is Theme => v === "system" || v === "light" || v === "dark";

/**
 * Set (or clear) data-theme on <html> and keep the browser's bar colour in step. Browser only.
 * The bar colour is an extra theme-color meta without a media query, put first in <head> so it wins over the
 * two per-scheme ones Next renders; those are React's and are left alone, so hydration finds them unchanged.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (theme === "system") {
    meta?.remove();
    return;
  }
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
  }
  meta.content = THEME_COLORS[theme];
  // always (re)move it to the front: React hoists its own metas to the top of <head> when it hydrates
  document.head.prepend(meta);
}

/**
 * Runs inline before the page paints, so a saved choice never flashes the other scheme first. Kept tiny and
 * dependency-free on purpose; it does what applyTheme() does.
 */
export const THEME_BOOT_SCRIPT =
  `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});` +
  `if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;` +
  `var m=document.createElement("meta");m.name="theme-color";m.content=${JSON.stringify(THEME_COLORS)}[t];` +
  `document.head.prepend(m)}}catch(e){}})();`;
