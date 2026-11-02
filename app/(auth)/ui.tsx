import type { ReactNode } from "react";

// Pieces shared by the login, register and setup pages. No hooks, so they render on the server.

export function AuthHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-0.5 lg:gap-1">
      {/* phone: the hand-lettered face in red, as on the palki's door; web: the book face */}
      <h1 className="font-script text-2xl leading-tight text-primary lg:font-serif lg:text-4xl lg:text-ink">{title}</h1>
      <p className="text-sm text-muted lg:text-base">{sub}</p>
    </div>
  );
}

/** The form's card, dressed as a palki: the parts are drawn by the .palki-* classes in globals.css. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="palki">
      <svg aria-hidden className="palki-finial" width="22" height="26" viewBox="0 0 22 26" fill="currentColor">
        <path d="M11 0 L12.6 9 H9.4Z" /><circle cx="11" cy="14" r="6.5" /><rect x="5.5" y="19.5" width="11" height="4" rx="1.5" />
      </svg>
      <div aria-hidden className="palki-roof" />
      <div aria-hidden className="palki-pole" />
      <div aria-hidden className="palki-tassel palki-tassel-l" />
      <div aria-hidden className="palki-tassel palki-tassel-r" />
      <div aria-hidden className="palki-fringe" />
      <section className="palki-cabin flex flex-col gap-4 lg:gap-5">
        <div aria-hidden className="palki-lattice" />
        {children}
      </section>
      <div aria-hidden className="palki-base" />
      <div aria-hidden className="palki-feet" />
    </div>
  );
}

/** "অথবা" / "or" between two ways of getting in. */
export function Or({ label }: { label: string }) {
  return <div role="separator" className="flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">{label}</div>;
}
