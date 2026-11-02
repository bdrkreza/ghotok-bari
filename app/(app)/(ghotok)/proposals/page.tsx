import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { Chips, Empty, PageHeader, ProposalBadge, primaryButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import type { Key } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { listProposals, proposalCounts, type ProposalListFilter, type ProposalRow } from "@/lib/services/proposals";
import { today } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("pr.title") };
}

const FILTERS: { key: ProposalListFilter; label: Key }[] = [
  { key: "live", label: "pr.live" },
  { key: "all", label: "pr.all" },
  { key: "thik_hoyeche", label: "proposalStatus.thik_hoyeche" },
  { key: "biye_hoyeche", label: "proposalStatus.biye_hoyeche" },
  { key: "bad", label: "proposalStatus.bad" },
];

/**
 * The ghotok's proposals. Each pair is a card: where the talks stand and when it last moved, the groom and the bride
 * side by side with their pictures (names wrap rather than cut off), the day to call again (marked once it has come)
 * and the first line of the note. Phone: one column; wide screens: two or three.
 */
export default async function ProposalsPage(props: PageProps<"/proposals">) {
  const [user, T] = await Promise.all([requireAdmin(), getT()]);
  const { t } = T;
  const query = await props.searchParams;
  const status = FILTERS.find((f) => f.key === query.status)?.key ?? "live";
  const db = getDb();
  const [rows, counts] = await Promise.all([listProposals(db, user.ghotokId, status), proposalCounts(db, user.ghotokId)]);
  const now = today();
  return (
    <>
      <PageHeader title={t("pr.title")} sub={t("pr.count", { n: rows.length })}
        action={<Link href="/proposals/new" className={`${primaryButton} min-h-11 px-3`}><Icon name="plus" size={18} />{t("common.new")}</Link>} />
      <Chips items={FILTERS.map((f) => ({ href: `/proposals?status=${f.key}`, label: t(f.label), active: f.key === status, count: counts[f.key] }))} />
      {rows.length ? (
        <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {rows.map((p) => {
            const due = p.followUpOn !== null && p.followUpOn <= now;
            return (
              <li key={p.id}>
                <Link href={`/proposals/${p.id}`} className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-primary/40">
                  <span className="flex items-center justify-between gap-2">
                    <ProposalBadge status={p.status} />
                    <span className="text-xs text-muted">{T.date(p.updatedAt)}</span>
                  </span>
                  <span className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2">
                    <Person who={p.patro} />
                    <span aria-hidden className="mt-3 grid size-8 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="rings" size={18} /></span>
                    <Person who={p.patri} />
                  </span>
                  {p.followUpOn ? (
                    <span className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${due ? "bg-warn text-warn-ink" : "bg-sunk text-muted"}`}>
                      <Icon name="calendar" size={18} />
                      {due ? t("pr.callDue") : t("pr.callOn", { date: T.date(p.followUpOn) })}
                    </span>
                  ) : null}
                  {p.note ? <span className="line-clamp-2 text-sm text-muted">{p.note}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty action={<Link href="/proposals/new" className={primaryButton}>{t("pp.propose")}</Link>}>{t("pr.empty")}</Empty>
      )}
    </>
  );
}

/** One side of the pair: picture, full name (two lines at most) and district. */
function Person({ who }: { who: ProposalRow["patro"] }) {
  return (
    <span className="flex min-w-0 flex-col items-center gap-1 text-center">
      <Avatar kind={who.kind} photoUrl={who.photoUrl} className="size-14" />
      <span className="line-clamp-2 text-sm leading-snug font-bold">{who.name}</span>
      <span className="truncate text-xs text-muted">{who.district}</span>
    </span>
  );
}
