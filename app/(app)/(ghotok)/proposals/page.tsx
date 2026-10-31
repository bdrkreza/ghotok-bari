import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Chips, Empty, PageHeader, ProposalBadge, RowLink, primaryButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import type { Key } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { listProposals, type ProposalListFilter } from "@/lib/services/proposals";

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

export default async function ProposalsPage(props: PageProps<"/proposals">) {
  const [user, T] = await Promise.all([requireAdmin(), getT()]);
  const { t } = T;
  const query = await props.searchParams;
  const status = FILTERS.find((f) => f.key === query.status)?.key ?? "live";
  const rows = await listProposals(getDb(), user.ghotokId, status);
  return (
    <>
      <PageHeader title={t("pr.title")} sub={t("pr.count", { n: rows.length })}
        action={<Link href="/proposals/new" className={`${primaryButton} min-h-11 px-3`}><Icon name="plus" size={18} />{t("common.new")}</Link>} />
      <Chips items={FILTERS.map((f) => ({ href: `/proposals?status=${f.key}`, label: t(f.label), active: f.key === status }))} />
      {rows.length ? (
        <div className="rounded-2xl border border-line bg-surface px-4">
          {rows.map((p) => (
            <RowLink key={p.id} href={`/proposals/${p.id}`} title={t("common.and", { a: p.patro.name, b: p.patri.name })}
              sub={`${p.patro.district} · ${p.patri.district} · ${T.date(p.updatedAt)}`} right={<ProposalBadge status={p.status} />} />
          ))}
        </div>
      ) : (
        <Empty action={<Link href="/proposals/new" className={primaryButton}>{t("pp.propose")}</Link>}>{t("pr.empty")}</Empty>
      )}
    </>
  );
}
