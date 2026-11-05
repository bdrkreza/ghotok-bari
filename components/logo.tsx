/**
 * The site's mark: a house (বাড়ি) with a heart for its door and a gold roof line. Colours come from the theme tokens, so it
 * recolours in the dark theme. `tone="panel"` is for the maroon phone bar (a light tile, maroon house).
 * The home-screen icons and the favicon draw the same shapes with fixed brand colours: scripts/icons.mjs, app/icon.svg.
 */
export function Logo({ tone = "primary", className }: { tone?: "primary" | "panel"; className?: string }) {
  const panel = tone === "panel";
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <rect width="100" height="100" className={panel ? "fill-on-panel" : "fill-primary"} />
      <rect x="65" y="24" width="7" height="16" rx="1.5" className="fill-gold" />
      <path d="M24 52 50 30 76 52V77Q76 81 72 81H28Q24 81 24 77Z" className={panel ? "fill-panel" : "fill-on-primary"} />
      <path d="M17 54 50 26 83 54" fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" className="stroke-gold" />
      <path
        d="M50 72C38 63 35 58 35 54C35 50 38 47.5 41.5 47.5C45 47.5 48 49.5 50 53C52 49.5 55 47.5 58.5 47.5C62 47.5 65 50 65 54C65 58 62 63 50 72Z"
        className={panel ? "fill-on-panel" : "fill-primary"}
      />
    </svg>
  );
}
