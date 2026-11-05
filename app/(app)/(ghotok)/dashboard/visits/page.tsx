import type { Metadata } from "next";
import Link from "next/link";
import { Card, Empty, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { initials } from "@/lib/bn";
import { getDb } from "@/lib/db";
import type { Key } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { listProfileEvents, weekEventCounts } from "@/lib/services/views";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("vl.title") };
}

/** Which family looked at which biodata, put it on their short list, or asked about it: the latest three hundred. */
export default async function VisitsPage() {
  const [admin, T] = await Promise.all([requireAdmin(), getT()]);
  const { t } = T;
  const db = getDb();
  const [rows, week] = await Promise.all([listProfileEvents(db, admin.ghotokId), weekEventCounts(db, admin.ghotokId)]);

  return (
    <>
      <PageHeader title={t("vl.title")} back="/dashboard" sub={t("vl.sub")} />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <Card>
          {rows.length ? (
            <ol className="divide-y divide-line">
              {rows.map((r) => {
                const who = r.who ?? t("ac.someone");
                return (
                  <li key={r.id} className="flex items-start gap-3 py-3">
                    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-sky text-sm font-bold text-sky-ink">{initials(who)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-bold">{who}</span> {t(`vl.${r.kind}` as Key)}:{" "}
                        <Link href={`/profiles/${r.profileId}`} className="font-semibold text-primary">{T.biodataNo(r.profileKind, r.code)} · {r.name}</Link>
                      </p>
                      <p className="text-xs text-muted">{T.dateTime(r.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <Empty>{t("vl.none")}</Empty>
          )}
        </Card>
        <div className="flex flex-col gap-5">
          <Card title={t("vl.weekTitle")}>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {(["view", "favorite", "interest"] as const).map((k) => (
                <div key={k} className="rounded-2xl bg-primary-soft px-2 py-3">
                  <dd className="font-display text-2xl font-extrabold text-primary">{T.n(week[k])}</dd>
                  <dt className="text-xs text-muted">{t(`vl.count.${k}` as Key)}</dt>
                </div>
              ))}
            </dl>
          </Card>
          <Card title={t("vl.howTitle")}>
            <p className="text-sm text-muted">{t("vl.how")}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
