import { Icon } from "@/components/icons";
import { DeleteProposalForm, FollowUpForm, LedgerForm, NoteForm, StatusForm } from "@/components/proposal-forms";
import { Badge, Card, PageHeader, ProposalBadge, RowLink } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { PROPOSAL_STATUS } from "@/lib/bn";
import { getDb } from "@/lib/db";
import type { ProposalEvent } from "@/lib/db/schema";
import type { T } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { orNotFound } from "@/lib/not-found";
import { totalsOf } from "@/lib/services/ledger";
import { LIVE, getProposal, nextStatuses } from "@/lib/services/proposals";
import { ageFromYear, today } from "@/lib/time";

export default async function ProposalPage(props: PageProps<"/proposals/[id]">) {
  const [user, T] = await Promise.all([requireAdmin(), getT()]);
  const { t } = T;
  const { id } = await props.params;
  const p = await orNotFound(getProposal(getDb(), user.ghotokId, id));
  const money = totalsOf(p.ledger);
  const next = nextStatuses(p.status);

  return (
    <>
      <PageHeader title={t("common.and", { a: p.patro.name, b: p.patri.name })} back="/proposals" sub={t("pr.detailSub", { date: T.date(p.createdAt) })} />

      {/* One column on a phone, in this order. On a wide screen the talks are on the left and the money on the right. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5 lg:col-span-3">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-muted">{t("pr.now")}</span>
              <ProposalBadge status={p.status} />
            </div>
            <div>
              <RowLink href={`/profiles/${p.patro.id}`} title={<><Icon name="groom" size={18} className="mr-1 inline text-muted" />{p.patro.name}</>}
                sub={`${t("kind.patro")} · ${T.years(ageFromYear(p.patro.birthYear))} · ${[p.patro.village, p.patro.district].filter(Boolean).join(", ")}`} />
              <RowLink href={`/profiles/${p.patri.id}`} title={<><Icon name="bride" size={18} className="mr-1 inline text-muted" />{p.patri.name}</>}
                sub={`${t("kind.patri")} · ${T.years(ageFromYear(p.patri.birthYear))} · ${[p.patri.village, p.patri.district].filter(Boolean).join(", ")}`} />
            </div>
            {p.note ? <p className="whitespace-pre-line text-sm text-muted">{p.note}</p> : null}
          </Card>

          {next.length ? (
            <Card title={t("pr.nextStep")}>
              <StatusForm id={p.id} next={next} />
            </Card>
          ) : null}

          {LIVE.includes(p.status) ? (
            <Card title={t("pr.followUp")}>
              <p className="text-sm text-muted">{p.followUpOn ? t("pr.followUpWhen", { date: T.date(p.followUpOn) }) : t("pr.followUpHint")}</p>
              <FollowUpForm id={p.id} current={p.followUpOn} today={today()} />
            </Card>
          ) : null}

          <Card title={t("pr.talks")}>
            <NoteForm id={p.id} />
            <ol className="flex flex-col gap-3">
              {p.events.map((e) => <Event key={e.id} e={e} T={T} />)}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card title={t("pr.money")}>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-xs font-bold text-muted">{t("money.agreed")}</p><p className="font-display text-lg font-bold tabular-nums">{T.money(money.chukti)}</p></div>
              <div><p className="text-xs font-bold text-muted">{t("money.received")}</p><p className="font-display text-lg font-bold tabular-nums text-pos">{T.money(money.joma)}</p></div>
              <div><p className="text-xs font-bold text-muted">{t("money.due")}</p><p className={`font-display text-lg font-bold tabular-nums ${money.baki > 0 ? "text-neg" : ""}`}>{T.money(money.baki)}</p></div>
            </div>
            {p.ledger.length ? (
              <ul className="divide-y divide-line">
                {[...p.ledger].sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1)).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{t(`ledgerKind.${l.kind}`)}</span>
                      <span className="text-muted"> · {T.date(l.entryDate)}{l.note ? ` · ${l.note}` : ""}</span>
                    </span>
                    <span className={`font-bold tabular-nums ${l.kind === "joma" ? "text-pos" : l.kind === "khoroch" ? "text-neg" : ""}`}>{T.money(l.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <LedgerForm proposals={[]} proposalId={p.id} today={today()} />
          </Card>

          <details className="rounded-2xl border border-line bg-surface p-4">
            <summary className="cursor-pointer font-semibold text-neg">{t("pr.delete")}</summary>
            <div className="pt-4"><DeleteProposalForm id={p.id} /></div>
          </details>
        </div>
      </div>
    </>
  );
}

function Event({ e, T }: { e: ProposalEvent; T: T }) {
  const when = T.dateTime(e.createdAt);
  if (e.kind === "note") {
    return (
      <li className="flex gap-3">
        <Icon name="note" size={18} className="mt-0.5 shrink-0 text-muted" />
        <div className="min-w-0 flex-1"><p className="whitespace-pre-line">{e.note}</p><p className="text-xs text-muted">{when}</p></div>
      </li>
    );
  }
  return (
    <li className="flex gap-3">
      <Icon name={e.kind === "created" ? "sparkle" : "check"} size={18} className="mt-0.5 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5">
          {e.kind === "created" ? T.t("pr.created") : T.t("pr.statusChanged")}
          {e.toStatus ? <Badge tone={PROPOSAL_STATUS[e.toStatus].tone}>{T.t(`proposalStatus.${e.toStatus}`)}</Badge> : null}
        </p>
        {e.note ? <p className="text-sm text-muted">{e.note}</p> : null}
        <p className="text-xs text-muted">{when}</p>
      </div>
    </li>
  );
}
