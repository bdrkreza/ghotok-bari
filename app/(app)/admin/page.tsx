import type { Metadata } from "next";
import { RoleForm } from "@/components/admin-forms";
import { Icon, type IconName } from "@/components/icons";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { bn, initials, taka } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { listGhotoks, platformStats } from "@/lib/services/admin";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "অ্যাডমিন" };

/** The admin dashboard: the whole platform in numbers, and every ghotok with what they have on file. */
export default async function AdminPage(props: PageProps<"/admin">) {
  const admin = await requireAdmin();
  const query = await props.searchParams;
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const db = getDb();
  const [stats, ghotoks] = await Promise.all([platformStats(db, admin), listGhotoks(db, admin, q)]);
  const pct = stats.chukti > 0 ? Math.min(100, Math.round((stats.joma / stats.chukti) * 100)) : 0;

  return (
    <>
      <PageHeader title="অ্যাডমিন ড্যাশবোর্ড" sub="সব ঘটকের সারসংক্ষেপ; শুধু অ্যাডমিন দেখেন" />

      <section aria-label="এক নজরে" className="grid grid-cols-2 gap-1 rounded-3xl border border-line bg-surface p-2 lg:grid-cols-4">
        <Stat icon="people" value={bn(stats.ghotoks)} label={`ঘটক · ৩০ দিনে নতুন ${bn(stats.newGhotoks)}`} />
        <Stat icon="groom" value={`${bn(stats.patro)} / ${bn(stats.patri)}`} label="পাত্র / পাত্রী খুঁজছে" />
        <Stat icon="heart" value={bn(stats.liveProposals)} label="চলমান প্রস্তাব" />
        <Stat icon="check" value={bn(stats.marriages)} label="বিয়ে ঠিক / হয়েছে" />
      </section>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold text-primary">ঘটক</p>
              <h2 className="font-display text-xl font-bold lg:text-2xl">সব ঘটক</h2>
            </div>
            <form method="get" action="/admin" role="search" className="flex gap-2">
              <label htmlFor="q" className="sr-only">ঘটক খুঁজুন</label>
              <input id="q" name="q" defaultValue={q} placeholder="নাম বা মোবাইল…" inputMode="search"
                className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-64" />
              <button type="submit" aria-label="খুঁজুন" className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface"><Icon name="search" size={18} /></button>
            </form>
          </div>

          {ghotoks.length ? (
            <ul className="flex flex-col gap-3">
              {ghotoks.map((g) => (
                <li key={g.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 lg:flex-row lg:items-center lg:gap-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary">{initials(g.name)}</span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-bold">
                        <span className="truncate">{g.name}</span>
                        {g.role === "admin" ? <Badge tone="lilac">অ্যাডমিন</Badge> : null}
                        {g.id === admin.id ? <Badge tone="sky">আপনি</Badge> : null}
                      </p>
                      <p className="truncate text-sm text-muted">
                        {bn(g.phone)} · যোগ {formatDate(g.joined)}{g.lastSeen ? ` · শেষ দেখা ${formatDate(g.lastSeen)}` : ""}
                      </p>
                    </div>
                  </div>
                  <dl className="grid shrink-0 grid-cols-4 gap-2 text-center lg:w-72">
                    <Num label="পাত্র-পাত্রী" value={bn(g.profiles)} />
                    <Num label="প্রস্তাব" value={bn(g.proposals)} />
                    <Num label="বিয়ে" value={bn(g.marriages)} />
                    <Num label="জমা" value={taka(g.joma)} />
                  </dl>
                  {g.id === admin.id ? null : g.envAdmin ? (
                    <p className="text-xs text-muted lg:w-40">ADMIN_PHONES থেকে অ্যাডমিন</p>
                  ) : (
                    <RoleForm id={g.id} admin={g.role === "admin"} />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{q ? `"${q}" নামে কোনো ঘটক নেই।` : "এখনো কোনো ঘটক নেই।"}</Empty>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-primary">টাকার হিসাব</p>
            <h2 className="font-display text-xl font-bold lg:text-2xl">সব ঘটক মিলিয়ে</h2>
          </div>
          <div className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-5 lg:p-6">
            <div>
              <p className="text-sm text-muted">মোট চুক্তি</p>
              <p className="font-display text-3xl font-bold tabular-nums">{taka(stats.chukti)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <div role="progressbar" aria-label="আদায়" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-primary-soft">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-sm text-muted">{bn(pct)}% আদায় হয়েছে</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-pos-soft p-4">
                <p className="text-sm font-semibold text-pos">জমা</p>
                <p className="font-display text-xl font-bold tabular-nums text-pos">{taka(stats.joma)}</p>
              </div>
              <div className="rounded-2xl bg-neg-soft p-4">
                <p className="text-sm font-semibold text-neg">বাকি</p>
                <p className="font-display text-xl font-bold tabular-nums text-neg">{taka(stats.chukti - stats.joma)}</p>
              </div>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted"><Icon name="link" size={16} className="text-primary" />শেয়ার করা বায়োডাটা লিংক {bn(stats.shares)}টি</p>
          </div>
          <Card title="ভূমিকা কীভাবে কাজ করে">
            <p className="text-sm text-muted">
              অ্যাডমিন সব ঘটকের সংখ্যা ও টাকার মোট দেখেন, কারও পাত্র-পাত্রী বা প্রস্তাবের ভেতরের তথ্য নয়। প্রথম অ্যাডমিন ঠিক হয়
              সার্ভারের ADMIN_PHONES দিয়ে; তারপর এখান থেকে অন্য ঘটককে অ্যাডমিন করা বা সরানো যায়। নিজের ভূমিকা নিজে বদলানো যায় না।
            </p>
          </Card>
        </section>
      </div>
    </>
  );
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl p-3 lg:p-4">
      <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={icon} size={24} /></span>
      <span className="flex min-w-0 flex-col">
        <span className="font-display text-3xl font-bold tabular-nums">{value}</span>
        <span className="text-sm leading-tight text-muted">{label}</span>
      </span>
    </div>
  );
}

function Num({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted">{label}</dt>
      <dd className="font-bold tabular-nums">{value}</dd>
    </div>
  );
}
