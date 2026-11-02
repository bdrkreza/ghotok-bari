import type { Metadata } from "next";
import Link from "next/link";
import { Card, Empty, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { initials } from "@/lib/bn";
import { getDb } from "@/lib/db";
import type { Key } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { listActivity } from "@/lib/services/activity";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("ac.title") };
}

/** Who on the ghotok's side did what, newest first: the last two hundred changes. */
export default async function ActivityPage() {
  const [admin, T] = await Promise.all([requireAdmin(), getT()]);
  const { t } = T;
  const rows = await listActivity(getDb(), admin.ghotokId);

  return (
    <>
      <PageHeader title={t("ac.title")} back="/dashboard" sub={t("ac.sub")} />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <Card>
          {rows.length ? (
            <ol className="divide-y divide-line">
              {rows.map((r) => {
                const who = r.actor ?? t("ac.someone");
                const what = t(`act.${r.action}` as Key);
                return (
                  <li key={r.id} className="flex items-start gap-3 py-3">
                    <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${r.actorId === admin.id ? "bg-primary-soft text-primary" : "bg-sky text-sky-ink"}`}>{initials(who)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-bold">{r.actorId === admin.id ? t("ac.you") : who}</span> {what}
                        {r.label ? <>: {r.href ? <Link href={r.href} className="font-semibold text-primary">{r.label}</Link> : <span className="font-semibold">{r.label}</span>}</> : null}
                      </p>
                      <p className="text-xs text-muted">{T.dateTime(r.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <Empty>{t("ac.none")}</Empty>
          )}
        </Card>
        <Card title={t("ac.howTitle")}>
          <p className="text-sm text-muted">{t("ac.how")}</p>
        </Card>
      </div>
    </>
  );
}
