import type { Metadata } from "next";
import Link from "next/link";
import { DeleteEntryButton, LedgerForm } from "@/components/proposal-forms";
import { Card, Empty, PageHeader, Tile } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { listEntries, totals } from "@/lib/services/ledger";
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
  const [money, rows, proposals] = await Promise.all([totals(db, user.ghotokId), listEntries(db, user.ghotokId), proposalOptions(db, user.ghotokId)]);
  return (
    <>
      <PageHeader title={t("lg.title")} sub={t("lg.sub")} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t("lg.totalAgreed")} value={T.money(money.chukti)} tone="lilac" />
        <Tile label={t("lg.received")} value={T.money(money.joma)} tone="mint" />
        <Tile label={t("lg.due")} value={T.money(money.baki)} tone={money.baki > 0 ? "coral" : "sky"} />
        <Tile label={t("lg.profit")} value={T.money(money.labh)} tone="mango" />
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
