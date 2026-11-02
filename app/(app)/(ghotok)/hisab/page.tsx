import type { Metadata } from "next";
import Link from "next/link";
import { DeleteEntryButton, LedgerForm } from "@/components/proposal-forms";
import { Icon } from "@/components/icons";
import { Card, Empty, PageHeader, Tile, quietButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { dues, listEntries, monthly, totals } from "@/lib/services/ledger";
import { proposalOptions } from "@/lib/services/proposals";
import { today } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("lg.title") };
}

export default async function HisabPage() {
  const [user, T] = await Promise.all([requireAdmin(), getT()]);
  const { t } = T;
  const db = getDb();
  const [money, rows, proposals, owing, months] = await Promise.all([
    totals(db, user.ghotokId), listEntries(db, user.ghotokId), proposalOptions(db, user.ghotokId), dues(db, user.ghotokId), monthly(db, user.ghotokId),
  ]);
  // the bars share one scale: the best month's receipts fill the height
  const top = Math.max(1, ...months.map((m) => m.joma));
  const monthName = (ym: string) => new Intl.DateTimeFormat(T.lang === "bn" ? "bn-BD" : "en-GB", { month: "short", timeZone: "Asia/Dhaka" }).format(new Date(`${ym}-15T00:00:00+06:00`));
  return (
    <>
      <PageHeader title={t("lg.title")} sub={t("lg.sub")} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t("lg.totalAgreed")} value={T.money(money.chukti)} tone="lilac" />
        <Tile label={t("lg.received")} value={T.money(money.joma)} tone="mint" />
        <Tile label={t("lg.due")} value={T.money(money.baki)} tone={money.baki > 0 ? "coral" : "sky"} />
        <Tile label={t("lg.profit")} value={T.money(money.labh)} tone="mango" />
      </div>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">
        <Card title={t("lg.monthlyTitle")} className="lg:col-span-3">
          <p className="text-sm text-muted">{t("lg.monthlySub")}</p>
          {/* one series, so no legend: the title names it; the table under it is the exact numbers */}
          <div role="img" aria-label={t("lg.monthlyAria")} className="flex h-36 items-end gap-2 border-b border-line">
            {months.map((m) => (
              <div key={m.month} title={`${monthName(m.month)}: ${T.money(m.joma)}`} className="group flex h-full flex-1 flex-col items-center justify-end">
                <div className="w-full max-w-10 rounded-t-[4px] bg-primary group-hover:bg-primary/80" style={{ height: `${m.joma ? Math.max(3, (m.joma / top) * 100) : 0}%` }} />
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-1.5 pr-2 font-bold">{t("lg.month")}</th>
                  <th className="py-1.5 pr-2 text-right font-bold">{t("lg.received")}</th>
                  <th className="py-1.5 pr-2 text-right font-bold">{t("lg.spent")}</th>
                  <th className="py-1.5 pr-2 text-right font-bold">{t("lg.agreedShort")}</th>
                  <th className="py-1.5 text-right font-bold">{t("lg.weddings")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...months].reverse().map((m) => (
                  <tr key={m.month}>
                    <td className="py-1.5 pr-2 font-semibold">{monthName(m.month)} {T.n(m.month.slice(0, 4))}</td>
                    <td className="py-1.5 pr-2 text-right text-pos">{T.money(m.joma)}</td>
                    <td className="py-1.5 pr-2 text-right text-neg">{T.money(m.khoroch)}</td>
                    <td className="py-1.5 pr-2 text-right">{T.money(m.chukti)}</td>
                    <td className="py-1.5 text-right">{T.n(m.weddings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={t("lg.duesTitle")} className="lg:col-span-2">
          {owing.length ? (
            <ul className="divide-y divide-line">
              {owing.map((d) => {
                const pair = t("common.and", { a: d.patro.name, b: d.patri.name });
                const message = encodeURIComponent(t("lg.duesWhatsapp", { pair, amount: T.money(d.baki) }));
                return (
                  <li key={d.proposalId} className="flex flex-col gap-2 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/proposals/${d.proposalId}`} className="min-w-0 truncate font-bold text-primary">{pair}</Link>
                      <span className="shrink-0 font-bold tabular-nums text-neg">{T.money(d.baki)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[{ who: "patro" as const, phone: d.patro.guardianPhone }, { who: "patri" as const, phone: d.patri.guardianPhone }].map(({ who, phone }) => phone ? (
                        <span key={who} className="flex gap-2">
                          <a href={`tel:${phone}`} className={`${quietButton} min-h-9 rounded-xl px-2.5 text-xs`}><Icon name="phone" size={14} />{t(`kind.${who}`)}</a>
                          <a href={`https://wa.me/88${phone}?text=${message}`} target="_blank" rel="noopener noreferrer" className={`${quietButton} min-h-9 rounded-xl px-2.5 text-xs`}><Icon name="share" size={14} />{t("common.whatsapp")}</a>
                        </span>
                      ) : null)}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>{t("lg.duesNone")}</Empty>
          )}
        </Card>
      </div>

      {/* Phone: the form, then the list. Wide screen: the form stays on the left while the list fills the right. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">
        <Card title={t("lg.newEntry")} className="lg:sticky lg:top-8 lg:col-span-2">
          <LedgerForm proposals={proposals} today={today()} />
        </Card>

        <Card title={t("lg.allEntries")} className="lg:col-span-3">
          {rows.length ? (
            <ul className="divide-y divide-line">
              {rows.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="font-bold">{t(`ledgerKind.${l.kind}`)}</span>
                      <span className="text-muted">{T.date(l.entryDate)}</span>
                    </p>
                    {l.proposal ? <Link href={`/proposals/${l.proposal.id}`} className="block truncate text-sm font-semibold text-primary">{t("common.and", { a: l.proposal.patro.name, b: l.proposal.patri.name })}</Link> : null}
                    {l.note ? <p className="truncate text-sm text-muted">{l.note}</p> : null}
                  </div>
                  <span className={`font-bold tabular-nums ${l.kind === "joma" ? "text-pos" : l.kind === "khoroch" ? "text-neg" : ""}`}>{T.money(l.amount)}</span>
                  <DeleteEntryButton id={l.id} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{t("lg.empty")}</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
