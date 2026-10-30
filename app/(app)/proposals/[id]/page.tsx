import { Icon } from "@/components/icons";
import { DeleteProposalForm, LedgerForm, NoteForm, StatusForm } from "@/components/proposal-forms";
import { Badge, Card, PageHeader, ProposalBadge, RowLink } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { LEDGER_KIND, PROPOSAL_STATUS, bn, taka } from "@/lib/bn";
import { getDb } from "@/lib/db";
import type { ProposalEvent } from "@/lib/db/schema";
import { orNotFound } from "@/lib/not-found";
import { totalsOf } from "@/lib/services/ledger";
import { getProposal, nextStatuses } from "@/lib/services/proposals";
import { ageFromYear, formatDate, formatDateTime, today } from "@/lib/time";

export default async function ProposalPage(props: PageProps<"/proposals/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const p = await orNotFound(getProposal(getDb(), user.id, id));
  const money = totalsOf(p.ledger);
  const next = nextStatuses(p.status);

  return (
    <>
      <PageHeader title={`${p.patro.name} ও ${p.patri.name}`} back="/proposals" sub={`প্রস্তাব · ${formatDate(p.createdAt)}`} />

      {/* One column on a phone, in this order. On a wide screen the talks are on the left and the money on the right. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5 lg:col-span-3">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-muted">এখন</span>
              <ProposalBadge status={p.status} />
            </div>
            <div>
              <RowLink href={`/profiles/${p.patro.id}`} title={<><Icon name="groom" size={18} className="mr-1 inline text-muted" />{p.patro.name}</>}
                sub={`পাত্র · ${bn(ageFromYear(p.patro.birthYear))} বছর · ${[p.patro.village, p.patro.district].filter(Boolean).join(", ")}`} />
              <RowLink href={`/profiles/${p.patri.id}`} title={<><Icon name="bride" size={18} className="mr-1 inline text-muted" />{p.patri.name}</>}
                sub={`পাত্রী · ${bn(ageFromYear(p.patri.birthYear))} বছর · ${[p.patri.village, p.patri.district].filter(Boolean).join(", ")}`} />
            </div>
            {p.note ? <p className="whitespace-pre-line text-sm text-muted">{p.note}</p> : null}
          </Card>

          {next.length ? (
            <Card title="পরের ধাপ">
              <StatusForm id={p.id} next={next} />
            </Card>
          ) : null}

          <Card title="কথাবার্তা">
            <NoteForm id={p.id} />
            <ol className="flex flex-col gap-3">
              {p.events.map((e) => <Event key={e.id} e={e} />)}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card title="এই বিয়ের টাকা">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-xs font-bold text-muted">চুক্তি</p><p className="font-display text-lg font-bold tabular-nums">{taka(money.chukti)}</p></div>
              <div><p className="text-xs font-bold text-muted">জমা</p><p className="font-display text-lg font-bold tabular-nums text-pos">{taka(money.joma)}</p></div>
              <div><p className="text-xs font-bold text-muted">বাকি</p><p className={`font-display text-lg font-bold tabular-nums ${money.baki > 0 ? "text-neg" : ""}`}>{taka(money.baki)}</p></div>
            </div>
            {p.ledger.length ? (
              <ul className="divide-y divide-line">
                {[...p.ledger].sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1)).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{LEDGER_KIND[l.kind].label}</span>
                      <span className="text-muted"> · {formatDate(l.entryDate)}{l.note ? ` · ${l.note}` : ""}</span>
                    </span>
                    <span className={`font-bold tabular-nums ${l.kind === "joma" ? "text-pos" : l.kind === "khoroch" ? "text-neg" : ""}`}>{taka(l.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <LedgerForm proposals={[]} proposalId={p.id} today={today()} />
          </Card>

          <details className="rounded-2xl border border-line bg-surface p-4">
            <summary className="cursor-pointer font-semibold text-neg">প্রস্তাব মুছে ফেলুন</summary>
            <div className="pt-4"><DeleteProposalForm id={p.id} /></div>
          </details>
        </div>
      </div>
    </>
  );
}

function Event({ e }: { e: ProposalEvent }) {
  const when = formatDateTime(e.createdAt);
  if (e.kind === "note") {
    return (
      <li className="flex gap-3">
        <Icon name="note" size={18} className="mt-0.5 shrink-0 text-muted" />
        <div className="min-w-0 flex-1"><p className="whitespace-pre-line">{e.note}</p><p className="text-xs text-muted">{when}</p></div>
      </li>
    );
  }
  const to = e.toStatus ? PROPOSAL_STATUS[e.toStatus] : null;
  return (
    <li className="flex gap-3">
      <Icon name={e.kind === "created" ? "sparkle" : "check"} size={18} className="mt-0.5 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5">
          {e.kind === "created" ? "প্রস্তাব দেওয়া হলো" : "অবস্থা বদলে"}
          {to ? <Badge tone={to.tone}>{to.label}</Badge> : null}
        </p>
        {e.note ? <p className="text-sm text-muted">{e.note}</p> : null}
        <p className="text-xs text-muted">{when}</p>
      </div>
    </li>
  );
}
