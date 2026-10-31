import type { ReactNode } from "react";

// Pieces shared by the login, register and setup pages. No hooks, so they render on the server.

export function AuthHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-3xl font-bold lg:text-4xl">{title}</h1>
      <p className="text-muted lg:text-lg">{sub}</p>
    </div>
  );
}

export function AuthCard({ children }: { children: ReactNode }) {
  return <section className="flex flex-col gap-5 rounded-3xl border border-line/70 bg-surface p-5 shadow-xl shadow-ink/5 lg:p-9">{children}</section>;
}

/** "অথবা" / "or" between two ways of getting in. */
export function Or({ label }: { label: string }) {
  return <div role="separator" className="flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">{label}</div>;
}
