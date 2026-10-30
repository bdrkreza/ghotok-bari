import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { ContactButtons, HowItWorks } from "@/components/site";
import { Badge, Card, Empty, outlineButton, primaryButton } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { APPROVAL, KIND_LABEL, biodataNo, bn } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { myBiodata } from "@/lib/services/biodata";
import { publicSite } from "@/lib/services/site";
import { ageFromYear, formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "আমার পাতা" };

/** The family's own page: the biodata they handed in and where each stands, how the site works, and how to reach the ghotok. */
export default async function MePage() {
  const me = await requireCustomer();
  const db = getDb();
  const [site, mine] = await Promise.all([publicSite(db), myBiodata(db, me.ghotokId, me.id)]);
  const pending = mine.filter((b) => b.approval === "pending").length;

  return (
    <>
      <section className="flex flex-col gap-4 rounded-3xl border border-primary-soft bg-linear-to-br from-primary-soft/60 via-bg to-surface p-5 lg:p-8">
        <span className="self-start rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">{site?.name}</span>
        <h1 className="font-display text-3xl/[1.2] font-extrabold lg:text-4xl/[1.2]">
          আসসালামু আলাইকুম,<br /><span className="text-primary">{me.name}</span>
        </h1>
        <p className="text-muted lg:text-lg">
          এখন {bn(site?.patro ?? 0)} জন পাত্র ও {bn(site?.patri ?? 0)} জন পাত্রীর খোঁজ চলছে।{" "}
          {pending ? `আপনার ${bn(pending)}টি বায়োডাটা ঘটক দেখছেন।` : "আপনার বায়োডাটা দিলে ঘটক মিলিয়ে দেখবেন।"}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <Link href="/patro" className={outlineButton}>পাত্র দেখুন</Link>
          <Link href="/patri" className={outlineButton}>পাত্রী দেখুন</Link>
        </div>
      </section>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-primary">আমার বায়োডাটা</p>
              <h2 className="font-display text-xl font-bold lg:text-2xl">আপনার দেওয়া বায়োডাটা</h2>
            </div>
            {mine.length ? <Link href="/me/biodata/new" className={`${primaryButton} min-h-11 shrink-0 px-3 text-sm`}><Icon name="plus" size={18} />নতুন</Link> : null}
          </div>
          {mine.length ? (
            <ul className="flex flex-col gap-3">
              {mine.map((b) => (
                <li key={b.id}>
                  <Link href={`/me/biodata/${b.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-primary/40">
                    <Avatar kind={b.kind} photoUrl={b.photoUrl} className="size-14" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold">{b.name}</span>
                        <Badge tone={APPROVAL[b.approval].tone}>{APPROVAL[b.approval].label}</Badge>
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {KIND_LABEL[b.kind]} · {biodataNo(b.kind, b.code)} · {bn(ageFromYear(b.birthYear))} বছর · {b.district}
                      </span>
                      {b.approval === "returned" && b.returnNote ? <span className="mt-1 block text-sm text-neg">ঘটক: {b.returnNote}</span> : null}
                      <span className="block text-xs text-muted">{b.approval === "pending" ? "জমা" : "হালনাগাদ"} {formatDate(b.updatedAt)}</span>
                    </span>
                    <Icon name="chevronRight" size={18} className="text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty action={
              <div className="grid grid-cols-2 gap-3">
                <Link href="/me/biodata/new?kind=patro" className={outlineButton}><Icon name="plus" size={18} />পাত্রের</Link>
                <Link href="/me/biodata/new?kind=patri" className={primaryButton}><Icon name="plus" size={18} />পাত্রীর</Link>
              </div>
            }>
              এখনো কোনো বায়োডাটা দেওয়া হয়নি। নিজের বা পরিবারের কারও জন্য বায়োডাটা দিন; ঘটক দেখে তালিকায় তুলবেন।
            </Empty>
          )}
          <HowItWorks />
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-primary">ঘটক</p>
            <h2 className="font-display text-xl font-bold lg:text-2xl">যোগাযোগ</h2>
          </div>
          {site ? (
            <Card>
              <div className="flex items-center gap-3">
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary">ঘ</span>
                <div className="min-w-0">
                  <p className="truncate font-bold">{site.ghotokName}</p>
                  <p className="truncate text-sm text-muted">{site.address ?? site.name}</p>
                </div>
              </div>
              <p className="text-sm text-muted">কোনো বায়োডাটা পছন্দ হলে নম্বরটি বলে ফোন করুন; নিজের বায়োডাটা দিতে সাহায্য লাগলেও।</p>
              <ContactButtons phone={site.phone} whatsapp={site.whatsapp} />
            </Card>
          ) : null}
        </section>
      </div>
    </>
  );
}
