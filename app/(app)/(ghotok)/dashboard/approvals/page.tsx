import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { submittedProfiles } from "@/lib/services/profiles";
import { ageFromYear } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("apv.title") };
}

const TABS = ["pending", "returned"] as const;

/** Biodata families handed in: those waiting for the ghotok, and those sent back to be fixed. Each opens the person's page. */
export default async function ApprovalsPage(props: PageProps<"/dashboard/approvals">) {
  const [admin, T] = await Promise.all([requireAdmin(), getT()]);
  const { t } = T;
  const query = await props.searchParams;
  const tab = query.tab === "returned" ? "returned" : "pending";
  const rows = await submittedProfiles(getDb(), admin.ghotokId, tab);

  return (
    <>
      <PageHeader title={t("apv.title")} back="/dashboard" sub={t("apv.sub")} />

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <section className="flex min-w-0 flex-col gap-4">
          <nav aria-label={t("list.status")} className="flex gap-1 rounded-2xl border border-line bg-surface px-2">
            {TABS.map((key) => {
              const on = key === tab;
              return (
                <Link key={key} href={`/dashboard/approvals?tab=${key}`} aria-current={on ? "page" : undefined}
                  className={`-mb-px shrink-0 border-b-2 px-3 py-3 text-sm font-bold ${on ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}>
                  {t(`apv.${key}`)}
                </Link>
              );
            })}
          </nav>

          {rows.length ? (
            <ul className="flex flex-col gap-3">
              {rows.map(({ profile: p, owner }) => (
                <li key={p.id}>
                  <Link href={`/profiles/${p.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-primary/40">
                    <Avatar kind={p.kind} photoUrl={p.photoUrl} className="size-14" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold">{p.name}</span>
                        <Badge tone={p.kind === "patro" ? "sky" : "lilac"}>{t(`kind.${p.kind}`)}</Badge>
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {T.biodataNo(p.kind, p.code)} · {T.years(ageFromYear(p.birthYear))} · {[p.upazila, p.district].filter(Boolean).join(", ")}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {owner ? `${owner.name} · ${T.n(owner.phone ?? "")}` : t("apv.deletedAccount")} · {tab === "pending" ? t("apv.submittedOn", { date: T.date(p.updatedAt) }) : t("apv.returnedOn", { date: T.date(p.updatedAt) })}
                      </span>
                      {tab === "returned" && p.returnNote ? <span className="mt-1 block text-sm text-neg">{t("pp.yourNote", { note: p.returnNote })}</span> : null}
                    </span>
                    <Icon name="chevronRight" size={18} className="text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{tab === "pending" ? t("apv.nonePending") : t("apv.noneReturned")}</Empty>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <Card title={t("apv.howTitle")}>
            <p className="text-sm text-muted">{t("apv.how1")}</p>
            <p className="text-sm text-muted">{t("apv.how2")}</p>
          </Card>
        </section>
      </div>
    </>
  );
}
