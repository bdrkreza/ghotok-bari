"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icons";
import { Badge } from "./ui";
import { APPROVAL, PROFILE_STATUS, PROPOSAL_STATUS } from "@/lib/bn";
import type { Approval, ProfileStatus, ProposalStatus } from "@/lib/db/schema";
import { useT } from "@/lib/i18n/client";

// The building blocks that carry words of their own, so they need the language. Re-exported from ui.tsx.

export function PageHeader({ title, back, action, sub }: { title: string; back?: string; action?: ReactNode; sub?: string }) {
  const { t } = useT();
  return (
    <header className="flex items-center gap-3">
      {back ? (
        <Link href={back} aria-label={t("common.back")} className="grid size-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface">
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

export function ProfileBadge({ status }: { status: ProfileStatus }) {
  const { t } = useT();
  return <Badge tone={PROFILE_STATUS[status].tone}>{t(`profileStatus.${status}`)}</Badge>;
}

export function ProposalBadge({ status }: { status: ProposalStatus }) {
  const { t } = useT();
  return <Badge tone={PROPOSAL_STATUS[status].tone}>{t(`proposalStatus.${status}`)}</Badge>;
}

export function ApprovalBadge({ approval }: { approval: Approval }) {
  const { t } = useT();
  return <Badge tone={APPROVAL[approval].tone}>{t(`approval.${approval}`)}</Badge>;
}

/** A small set of links that act like tabs: the current one is filled. */
/** Filter chips that wrap onto a second line rather than scroll, so none hides off the edge; count, when given, sits in a bubble. */
export function Chips({ items }: { items: { href: string; label: string; active: boolean; count?: number }[] }) {
  const { t, n } = useT();
  return (
    <nav className="flex flex-wrap gap-2" aria-label={t("common.filters")}>
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={it.active ? "page" : undefined}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold ${it.active ? "bg-ink text-bg" : "border border-line bg-surface text-muted"}`}>
          {it.label}
          {it.count !== undefined ? (
            <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] leading-none ${it.active ? "bg-bg/20" : "bg-sunk"}`}>{n(it.count)}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
