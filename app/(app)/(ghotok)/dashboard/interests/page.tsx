import type { Metadata } from "next";
import Link from "next/link";
import { InterestActions } from "./_components/interest-forms";
import { Icon } from "@/components/icons";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import type { InterestStatus } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { asker, listInterests } from "@/lib/services/interests";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("in.title") };
}

const TABS: InterestStatus[] = ["new", "proposed", "closed"];

/**
 * "আগ্রহ জানান" from families: who asked about which biodata, and for whom. With a "for whom" the ghotok proposes in
 * one tap; without, they call the family. Closed requests can be opened again.
 */
export default async function InterestsPage(props: PageProps<"/dashboard/interests">) {
  const [admin, T] = await Promise.all([requireAdmin(), getT()]);
  const { t } = T;
  const query = await props.searchParams;
  const tab = TABS.find((s) => s === query.tab) ?? "new";
  const rows = await listInterests(getDb(), admin.ghotokId, tab);

  return (
    <>
      <PageHeader title={t("in.title")} back="/dashboard" sub={t("in.sub")} />

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <section className="flex min-w-0 flex-col gap-4">
          <nav aria-label={t("list.status")} className="flex gap-1 rounded-2xl border border-line bg-surface px-2">
            {TABS.map((key) => {
              const on = key === tab;
              return (
                <Link key={key} href={`/dashboard/interests?tab=${key}`} aria-current={on ? "page" : undefined}
                  className={`-mb-px shrink-0 border-b-2 px-3 py-3 text-sm font-bold ${on ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}>
                  {t(`in.tab.${key}`)}
                </Link>
              );
            })}
          </nav>

          {rows.length ? (
            <ul className="flex flex-col gap-3">
              {rows.map((r) => {
                const who = asker(r);
                const canPropose = tab === "new" && r.forProfile?.approval === "approved";
                return (
                  <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
                    <div className="flex items-start gap-3">
                      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="heart" size={20} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{who.name} <a href={`tel:${who.phone}`} className="font-semibold text-primary">{T.n(who.phone)}</a></p>
                        <p className="text-sm text-muted">{T.dateTime(r.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl bg-sunk p-3 text-sm">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-muted">{t("in.likes")}</span>
                        <Link href={`/profiles/${r.profile.id}`} className="font-bold text-primary">{r.profile.name}</Link>
                        <Badge tone={r.profile.kind === "patro" ? "sky" : "lilac"}>{T.biodataNo(r.profile.kind, r.profile.code)}</Badge>
                      </p>
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-muted">{t("in.for")}</span>
                        {r.forProfile ? (
                          <>
                            <Link href={`/profiles/${r.forProfile.id}`} className="font-bold text-primary">{r.forProfile.name}</Link>
                            <Badge tone={r.forProfile.kind === "patro" ? "sky" : "lilac"}>{T.biodataNo(r.forProfile.kind, r.forProfile.code)}</Badge>
                          </>
                        ) : <span>{t("in.forUnknown")}</span>}
                      </p>
                      {r.note ? <p className="whitespace-pre-line">“{r.note}”</p> : null}
                    </div>
                    {tab === "proposed" && r.proposalId ? (
                      <Link href={`/proposals/${r.proposalId}`} className="text-sm font-bold text-primary">{t("in.openProposal")} →</Link>
                    ) : (
                      <InterestActions id={r.id} status={tab} canPropose={canPropose} phone={who.phone} />
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>{t(`in.none.${tab}`)}</Empty>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <Card title={t("in.howTitle")}>
            <p className="text-sm text-muted">{t("in.how1")}</p>
            <p className="text-sm text-muted">{t("in.how2")}</p>
          </Card>
        </section>
      </div>
    </>
  );
}
