import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Chips, Empty, PageHeader, ProposalBadge, RowLink, primaryButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { PROPOSAL_STATUS, bn } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { listProposals, type ProposalListFilter } from "@/lib/services/proposals";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "প্রস্তাব" };

const FILTERS: { key: ProposalListFilter; label: string }[] = [
  { key: "live", label: "চলমান" },
  { key: "all", label: "সব" },
  { key: "thik_hoyeche", label: PROPOSAL_STATUS.thik_hoyeche.label },
  { key: "biye_hoyeche", label: PROPOSAL_STATUS.biye_hoyeche.label },
  { key: "bad", label: PROPOSAL_STATUS.bad.label },
];

export default async function ProposalsPage(props: PageProps<"/proposals">) {
  const user = await requireAdmin();
  const query = await props.searchParams;
  const status = FILTERS.find((f) => f.key === query.status)?.key ?? "live";
  const rows = await listProposals(getDb(), user.ghotokId, status);
  return (
    <>
      <PageHeader title="প্রস্তাব" sub={`${bn(rows.length)} টি`}
        action={<Link href="/proposals/new" className={`${primaryButton} min-h-11 px-3`}><Icon name="plus" size={18} />নতুন</Link>} />
      <Chips items={FILTERS.map((f) => ({ href: `/proposals?status=${f.key}`, label: f.label, active: f.key === status }))} />
      {rows.length ? (
        <div className="rounded-2xl border border-line bg-surface px-4">
          {rows.map((p) => (
            <RowLink key={p.id} href={`/proposals/${p.id}`} title={`${p.patro.name} ও ${p.patri.name}`}
              sub={`${p.patro.district} · ${p.patri.district} · ${formatDate(p.updatedAt)}`} right={<ProposalBadge status={p.status} />} />
          ))}
        </div>
      ) : (
        <Empty action={<Link href="/proposals/new" className={primaryButton}>প্রস্তাব দিন</Link>}>এই তালিকায় কিছু নেই।</Empty>
      )}
    </>
  );
}
