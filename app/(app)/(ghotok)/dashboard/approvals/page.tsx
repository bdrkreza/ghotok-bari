import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { KIND_LABEL, biodataNo, bn } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { submittedProfiles } from "@/lib/services/profiles";
import { ageFromYear, formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "বায়োডাটা অনুরোধ" };

const TABS = [
  { key: "pending", label: "অপেক্ষমাণ" },
  { key: "returned", label: "ফেরত দেওয়া" },
] as const;

/** Biodata families handed in: those waiting for the ghotok, and those sent back to be fixed. Each opens the person's page. */
export default async function ApprovalsPage(props: PageProps<"/dashboard/approvals">) {
  const admin = await requireAdmin();
  const query = await props.searchParams;
  const tab = query.tab === "returned" ? "returned" : "pending";
  const rows = await submittedProfiles(getDb(), admin.ghotokId, tab);

  return (
    <>
      <PageHeader title="বায়োডাটা অনুরোধ" back="/dashboard" sub="পরিবারের দেওয়া বায়োডাটা; দেখে তালিকায় তুলুন বা ফেরত দিন" />

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <section className="flex min-w-0 flex-col gap-4">
          <nav aria-label="অবস্থা" className="flex gap-1 rounded-2xl border border-line bg-surface px-2">
            {TABS.map((t) => {
              const on = t.key === tab;
              return (
                <Link key={t.key} href={`/dashboard/approvals?tab=${t.key}`} aria-current={on ? "page" : undefined}
                  className={`-mb-px shrink-0 border-b-2 px-3 py-3 text-sm font-bold ${on ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}>
                  {t.label}
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
                        <Badge tone={p.kind === "patro" ? "sky" : "lilac"}>{KIND_LABEL[p.kind]}</Badge>
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {biodataNo(p.kind, p.code)} · {bn(ageFromYear(p.birthYear))} বছর · {[p.upazila, p.district].filter(Boolean).join(", ")}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {owner ? `${owner.name} · ${bn(owner.phone ?? "")}` : "অ্যাকাউন্ট মুছে গেছে"} · {tab === "pending" ? "জমা" : "ফেরত"} {formatDate(p.updatedAt)}
                      </span>
                      {tab === "returned" && p.returnNote ? <span className="mt-1 block text-sm text-neg">আপনার নোট: {p.returnNote}</span> : null}
                    </span>
                    <Icon name="chevronRight" size={18} className="text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{tab === "pending" ? "কোনো বায়োডাটা অপেক্ষায় নেই।" : "ফেরত দেওয়া কোনো বায়োডাটা নেই।"}</Empty>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <Card title="কীভাবে কাজ করে">
            <p className="text-sm text-muted">
              পরিবার নিজের পাতা থেকে বায়োডাটা জমা দিলে এখানে আসে; তালিকা, মিল-খোঁজা বা প্রস্তাবে তখনো যায় না।
              ব্যক্তির পাতায় গিয়ে পুরো তথ্য দেখে “তালিকায় তুলুন” চাপুন, নয়তো কারণ লিখে ফেরত দিন।
            </p>
            <p className="text-sm text-muted">পরিবার পরে কিছু বদলালে বায়োডাটা আবার এখানে ফিরে আসে।</p>
          </Card>
        </section>
      </div>
    </>
  );
}
