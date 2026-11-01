import type { Metadata } from "next";
import { RoleForm } from "./_components/customer-forms";
import { Icon } from "@/components/icons";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { initials } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { listCustomers } from "@/lib/services/customers";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nav.customers") };
}

/** Every account on the site: who signed up and when, who is an admin, and the buttons to change that. */
export default async function CustomersPage(props: PageProps<"/dashboard/customers">) {
  const [admin, T] = await Promise.all([requireAdmin(), getT()]);
  const { t } = T;
  const query = await props.searchParams;
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const rows = await listCustomers(getDb(), admin, q);
  const admins = rows.filter((r) => r.role === "admin").length;

  return (
    <>
      <PageHeader title={t("cu.title")} back="/dashboard" sub={q ? t("cu.searching", { q }) : t("cu.count", { n: rows.length, a: admins })} />

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <section className="flex min-w-0 flex-col gap-4">
          <form method="get" action="/dashboard/customers" role="search" className="flex gap-2">
            <label htmlFor="q" className="sr-only">{t("cu.searchAria")}</label>
            <input id="q" name="q" defaultValue={q} placeholder={t("cu.searchPlaceholder")} inputMode="search"
              className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-72" />
            <button type="submit" aria-label={t("common.search")} className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface"><Icon name="search" size={18} /></button>
          </form>

          {rows.length ? (
            <ul className="flex flex-col gap-3">
              {rows.map((c) => (
                <li key={c.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 lg:flex-row lg:items-center lg:gap-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary">{initials(c.name)}</span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-bold">
                        <span className="truncate">{c.name}</span>
                        {c.owner ? <Badge tone="mango">{t("cu.ghotok")}</Badge> : c.role === "admin" ? <Badge tone="lilac">{t("cu.admin")}</Badge> : <Badge tone="mint">{t("cu.customer")}</Badge>}
                        {c.id === admin.id ? <Badge tone="sky">{t("cu.you")}</Badge> : null}
                      </p>
                      <p className="truncate text-sm text-muted">
                        {T.n(c.phone)} · {t("cu.joined", { date: T.date(c.joined) })}{c.lastSeen ? ` · ${t("cu.lastSeen", { date: T.date(c.lastSeen) })}` : ""}
                      </p>
                    </div>
                  </div>
                  {c.id === admin.id || c.owner ? null : c.envAdmin ? (
                    <p className="text-xs text-muted lg:w-40">{t("cu.envAdmin")}</p>
                  ) : (
                    <RoleForm id={c.id} admin={c.role === "admin"} />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{q ? t("cu.noneFor", { q }) : t("cu.none")}</Empty>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <Card title={t("cu.howTitle")}>
            <p className="text-sm text-muted">{t("cu.how1")}</p>
            <p className="text-sm text-muted">{t("cu.how2")}</p>
          </Card>
        </section>
      </div>
    </>
  );
}
