import Link from "next/link";
import type { ReactNode } from "react";
import type { ProfileStatus, ProposalStatus } from "@/lib/db/schema";
import { PROFILE_STATUS, PROPOSAL_STATUS } from "@/lib/bn";
import { Icon } from "./icons";

// Building blocks shared by every screen. None of these use hooks, so they work in server components.

export function PageHeader({ title, back, action, sub }: { title: string; back?: string; action?: ReactNode; sub?: string }) {
  return (
    <header className="flex items-center gap-3">
      {back ? (
        <Link href={back} aria-label="পেছনে" className="grid size-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface">
          <Icon name="back" />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-xl font-bold text-balance lg:text-2xl">{title}</h1>
        {sub ? <p className="text-sm text-muted">{sub}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className = "", title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <section className={`flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 ${className}`}>
      {title ? <h2 className="font-display text-base font-bold">{title}</h2> : null}
      {children}
    </section>
  );
}

const BADGE = {
  mango: "bg-mango text-mango-ink",
  mint: "bg-mint text-mint-ink",
  sky: "bg-sky text-sky-ink",
  lilac: "bg-lilac text-lilac-ink",
  coral: "bg-coral text-coral-ink",
};

export type Tone = keyof typeof BADGE;

export function Badge({ children, tone = "lilac" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${BADGE[tone]}`}>{children}</span>;
}

export const ProfileBadge = ({ status }: { status: ProfileStatus }) => <Badge tone={PROFILE_STATUS[status].tone}>{PROFILE_STATUS[status].label}</Badge>;
export const ProposalBadge = ({ status }: { status: ProposalStatus }) => <Badge tone={PROPOSAL_STATUS[status].tone}>{PROPOSAL_STATUS[status].label}</Badge>;

// A tile is a white card; its tone is only a small dot, so a row of tiles stays calm.
const DOT: Record<Tone, string> = { mango: "bg-warn-ink", mint: "bg-pos", sky: "bg-sky-ink", lilac: "bg-primary", coral: "bg-neg" };

export function Tile({ label, value, tone, href }: { label: string; value: string; tone: Tone; href?: string }) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-sm font-semibold text-muted"><span aria-hidden className={`size-2 shrink-0 rounded-full ${DOT[tone]}`} />{label}</div>
      <div className="mt-0.5 font-display text-2xl font-bold tabular-nums">{value}</div>
    </>
  );
  const cls = "min-w-0 rounded-2xl border border-line bg-surface p-4";
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** A row that links somewhere: used for lists of people, proposals and so on. */
export function RowLink({ href, title, sub, right }: { href: string; title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 border-b border-line py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{title}</span>
        {sub ? <span className="block truncate text-sm text-muted">{sub}</span> : null}
      </span>
      {right}
      <Icon name="chevronRight" size={18} className="text-muted" />
    </Link>
  );
}

export const linkButton = "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-base font-bold";
export const primaryButton = `${linkButton} bg-primary text-on-primary`;
export const quietButton = `${linkButton} border border-line bg-surface`;
export const outlineButton = `${linkButton} border border-primary text-primary`;

/** Shown where a list would be, when there is nothing in it yet. */
export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-muted">
      <p>{children}</p>
      {action}
    </div>
  );
}

/** Label / value pairs: two per row on a phone, three on a wide screen. Empty values are left out. */
export function Facts({ items }: { items: (readonly [label: string, value: ReactNode | null | undefined])[] }) {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (!shown.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-3">
      {shown.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-bold text-muted">{label}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A small set of links that act like tabs: the current one is filled. */
export function Chips({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="ছাঁকনি">
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={it.active ? "page" : undefined}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ${it.active ? "bg-ink text-bg" : "border border-line bg-surface text-muted"}`}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
