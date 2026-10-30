import type { Metadata } from "next";
import Link from "next/link";
import { DeleteEntryButton, LedgerForm } from "@/components/proposal-forms";
import { Card, Empty, PageHeader, Tile } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { LEDGER_KIND, taka } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { listEntries, totals } from "@/lib/services/ledger";
import { proposalOptions } from "@/lib/services/proposals";
import { formatDate, today } from "@/lib/time";

export const metadata: Metadata = { title: "হিসাব" };

export default async function HisabPage() {
  const user = await requireUser();
  const db = getDb();
  const [money, rows, proposals] = await Promise.all([totals(db, user.id), listEntries(db, user.id), proposalOptions(db, user.id)]);
  return (
    <>
      <PageHeader title="হিসাব" sub="চুক্তি, জমা আর নিজের খরচ" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="মোট চুক্তি" value={taka(money.chukti)} tone="lilac" />
        <Tile label="জমা পেয়েছি" value={taka(money.joma)} tone="mint" />
        <Tile label="বাকি আছে" value={taka(money.baki)} tone={money.baki > 0 ? "coral" : "sky"} />
        <Tile label="লাভ (জমা − খরচ)" value={taka(money.labh)} tone="mango" />
      </div>

      {/* Phone: the form, then the list. Wide screen: the form stays on the left while the list fills the right. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">
        <Card title="নতুন লেখা" className="lg:sticky lg:top-8 lg:col-span-2">
          <LedgerForm proposals={proposals} today={today()} />
        </Card>

        <Card title="সব লেখা" className="lg:col-span-3">
          {rows.length ? (
            <ul className="divide-y divide-line">
              {rows.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="font-bold">{LEDGER_KIND[l.kind].label}</span>
                      <span className="text-muted">{formatDate(l.entryDate)}</span>
                    </p>
                    {l.proposal ? <Link href={`/proposals/${l.proposal.id}`} className="block truncate text-sm font-semibold text-primary">{l.proposal.patro.name} ও {l.proposal.patri.name}</Link> : null}
                    {l.note ? <p className="truncate text-sm text-muted">{l.note}</p> : null}
                  </div>
                  <span className={`font-bold tabular-nums ${l.kind === "joma" ? "text-pos" : l.kind === "khoroch" ? "text-neg" : ""}`}>{taka(l.amount)}</span>
                  <DeleteEntryButton id={l.id} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>এখনো কিছু লেখা হয়নি। পাশে প্রথম লেখাটি যোগ করুন।</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
