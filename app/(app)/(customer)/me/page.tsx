import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { FamilyBiodataCard } from "@/components/biodata";
import { Icon, type IconName } from "@/components/icons";
import { ContactButtons } from "@/components/site";
import { Badge, Card, outlineButton, primaryButton, quietButton } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { APPROVAL, KIND_LABEL, biodataNo, bn } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { myBiodata, recentBiodata } from "@/lib/services/biodata";
import { publicSite } from "@/lib/services/site";
import { ageFromYear, formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "আমার পাতা" };

/**
 * The family's home: the numbers at a glance, a checklist that follows where they are, the biodata they handed in,
 * the people listed most recently, and the ghotok to call.
 */
export default async function MePage() {
  const me = await requireCustomer();
  const db = getDb();
  const [site, mine, recent] = await Promise.all([publicSite(db), myBiodata(db, me.ghotokId, me.id), recentBiodata(db, me.ghotokId)]);
  const pending = mine.filter((b) => b.approval === "pending").length;
  const returned = mine.filter((b) => b.approval === "returned").length;
  const listed = mine.filter((b) => b.approval === "approved").length;

  // where the family is: account made, biodata handed in, approved, now looking
  const steps: { title: string; text: string; state: "done" | "now" | "later"; href?: string; cta?: string }[] = [
    { title: "অ্যাকাউন্ট খোলা হয়েছে", text: `${bn(me.phone)} নম্বরে`, state: "done" },
    mine.length
      ? { title: "বায়োডাটা জমা দেওয়া হয়েছে", text: `${bn(mine.length)}টি বায়োডাটা`, state: "done" }
      : { title: "বায়োডাটা জমা দিন", text: "নিজের বা পরিবারের কারও জন্য, পাঁচটি ছোট ধাপে", state: "now", href: "/me/biodata/new", cta: "শুরু করুন" },
    listed
      ? { title: "ঘটক তালিকায় তুলেছেন", text: `${bn(listed)}টি বায়োডাটা অন্য পরিবার দেখছে`, state: "done" }
      : returned
        ? { title: "ঘটক কিছু বদলাতে বলেছেন", text: "নিচে নোট দেখে ঠিক করে আবার জমা দিন", state: "now" }
        : pending
          ? { title: "ঘটকের অনুমোদনের অপেক্ষায়", text: "সাধারণত এক-দুই দিনের মধ্যে; তাড়া থাকলে ফোন করুন", state: "now" }
          : { title: "ঘটকের অনুমোদন", text: "জমা দিলে ঘটক দেখে তালিকায় তুলবেন", state: "later" },
    { title: "পাত্র-পাত্রী দেখুন", text: "পছন্দ হলে বায়োডাটা নম্বর বলে ঘটককে ফোন করুন", state: listed ? "now" : "later", href: "/patri", cta: "দেখুন" },
  ];

  return (
    <>
      <section className="flex flex-col gap-4 rounded-3xl border border-primary-soft bg-linear-to-br from-primary-soft/60 via-bg to-surface p-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:p-8">
        <div className="flex flex-col items-start gap-3">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">{site?.name}</span>
          <h1 className="font-display text-3xl/[1.2] font-extrabold lg:text-4xl/[1.2]">
            আসসালামু আলাইকুম,<br /><span className="text-primary">{me.name}</span>
          </h1>
          <p className="text-muted lg:text-lg">
            {mine.length
              ? pending ? `আপনার ${bn(pending)}টি বায়োডাটা ঘটক দেখছেন।` : returned ? "ঘটক একটি বায়োডাটায় বদল চেয়েছেন।" : "আপনার বায়োডাটা তালিকায় আছে; নতুন পাত্র-পাত্রী নিচে।"
              : "বায়োডাটা দিলে ঘটক মিলিয়ে দেখবেন; এর আগে অন্য কেউ কিছু দেখবে না।"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex lg:shrink-0">
          <Link href="/me/biodata/new" className={`${primaryButton} col-span-2 sm:col-span-1`}><Icon name="plus" size={18} />বায়োডাটা জমা দিন</Link>
          <Link href="/patro" className={outlineButton}>পাত্র দেখুন</Link>
          <Link href="/patri" className={outlineButton}>পাত্রী দেখুন</Link>
        </div>
      </section>

      <section aria-label="এক নজরে" className="grid grid-cols-3 gap-1 rounded-3xl border border-line bg-surface p-2">
        <Stat icon="note" value={bn(mine.length)} label={pending ? `আমার বায়োডাটা · ${bn(pending)} অপেক্ষায়` : "আমার বায়োডাটা"} href="#amar" />
        <Stat icon="groom" value={bn(site?.patro ?? 0)} label="পাত্র খুঁজছে" href="/patro" />
        <Stat icon="bride" value={bn(site?.patri ?? 0)} label="পাত্রী খুঁজছে" href="/patri" />
      </section>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-4">
            <SectionHead eyebrow="আপনার অগ্রগতি" title={listed ? "সব ঠিক আছে" : "পরের ধাপ"} />
            <ol className="flex flex-col divide-y divide-line rounded-3xl border border-line bg-surface">
              {steps.map((s, i) => (
                <li key={s.title} className={`flex items-center gap-4 p-4 ${s.state === "later" ? "opacity-60" : ""}`}>
                  <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${s.state === "done" ? "bg-pos text-bg" : s.state === "now" ? "bg-primary text-on-primary" : "bg-sunk text-muted"}`}>
                    {s.state === "done" ? <Icon name="check" size={18} /> : bn(i + 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{s.title}</span>
                    <span className="block text-sm text-muted">{s.text}</span>
                  </span>
                  {s.href && s.state === "now" ? <Link href={s.href} className={`${primaryButton} min-h-10 shrink-0 px-3 text-sm`}>{s.cta}</Link> : null}
                </li>
              ))}
            </ol>
          </section>

          <section id="amar" className="flex flex-col gap-4 scroll-mt-24">
            <SectionHead eyebrow="আমার বায়োডাটা" title="আপনার দেওয়া বায়োডাটা"
              links={mine.length ? [{ href: "/me/biodata/new", label: "নতুন বায়োডাটা" }] : []} />
            {mine.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {mine.map((b) => (
                  <li key={b.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
                    <div className="flex items-start gap-3">
                      <Avatar kind={b.kind} photoUrl={b.photoUrl} className="size-14" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{b.name}</p>
                        <p className="truncate text-sm text-muted">{KIND_LABEL[b.kind]} · {biodataNo(b.kind, b.code)} · {bn(ageFromYear(b.birthYear))} বছর · {b.district}</p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-2">
                          <Badge tone={APPROVAL[b.approval].tone}>{APPROVAL[b.approval].label}</Badge>
                          <span className="text-xs text-muted">{b.approval === "pending" ? "জমা" : "হালনাগাদ"} {formatDate(b.updatedAt)}</span>
                        </p>
                      </div>
                    </div>
                    {b.approval === "returned" ? (
                      <p className="rounded-xl bg-neg-soft px-3 py-2 text-sm font-semibold text-neg">ঘটক: {b.returnNote ?? "কারণ লেখা নেই; ফোন করুন"}</p>
                    ) : null}
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <Link href={`/me/biodata/${b.id}`} className={`${quietButton} min-h-10 text-sm`}>দেখুন</Link>
                      <Link href={`/me/biodata/${b.id}/edit`} className={`${b.approval === "returned" ? primaryButton : outlineButton} min-h-10 text-sm`}><Icon name="edit" size={16} />{b.approval === "returned" ? "ঠিক করুন" : "বদলান"}</Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line bg-surface px-5 py-8 text-center">
                <span aria-hidden className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="note" size={26} /></span>
                <div className="flex flex-col gap-1">
                  <p className="font-display text-lg font-bold">আপনার প্রথম বায়োডাটা দিন</p>
                  <p className="max-w-md text-sm text-muted">নিজের, ছেলে-মেয়ের বা পরিবারের কারও জন্য। নাম, ছবি ও যোগাযোগ শুধু ঘটক দেখেন; তালিকায় যায় শুধু বায়োডাটা নম্বর।</p>
                </div>
                <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
                  <Link href="/me/biodata/new?kind=patro" className={outlineButton}><Icon name="groom" size={18} />পাত্রের বায়োডাটা</Link>
                  <Link href="/me/biodata/new?kind=patri" className={primaryButton}><Icon name="bride" size={18} />পাত্রীর বায়োডাটা</Link>
                </div>
              </div>
            )}
          </section>

          {recent.length ? (
            <section className="flex flex-col gap-4">
              <SectionHead eyebrow="তালিকা" title="সম্প্রতি তালিকায় উঠেছে" links={[{ href: "/patro", label: "সব পাত্র" }, { href: "/patri", label: "সব পাত্রী" }]} />
              <ul className="grid gap-3 sm:grid-cols-2">
                {recent.map((b) => <li key={b.id}><FamilyBiodataCard b={b} /></li>)}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-4">
            <SectionHead eyebrow="ঘটক" title="যোগাযোগ" />
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
          <Card title="কে কী দেখে">
            <p className="text-sm text-muted">
              অন্য পরিবার দেখে বয়স, উচ্চতা, ধর্ম, শিক্ষা, পেশা, উপজেলা-জেলা, পরিবার আর প্রত্যাশা, সাথে বায়োডাটা নম্বর।
              নাম, ছবি, বাবা-মা, অভিভাবকের নম্বর, গ্রাম আর আয় শুধু ঘটক দেখেন।
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

/** One of the three numbers at a glance; the whole thing links somewhere. */
function Stat({ icon, value, label, href }: { icon: IconName; value: string; label: string; href: string }) {
  return (
    <Link href={href} className="flex flex-col items-start gap-2 rounded-2xl p-3 hover:bg-sunk sm:flex-row sm:items-center sm:gap-4 lg:p-4">
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary sm:size-14"><Icon name={icon} size={22} /></span>
      <span className="flex min-w-0 flex-col">
        <span className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{value}</span>
        <span className="text-xs leading-tight text-muted sm:text-sm">{label}</span>
      </span>
    </Link>
  );
}

/** A small red eyebrow over the section title, with links on the right. */
function SectionHead({ eyebrow, title, links = [] }: { eyebrow: string; title: string; links?: { href: string; label: string }[] }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold text-primary">{eyebrow}</p>
        <h2 className="font-display text-xl font-bold lg:text-2xl">{title}</h2>
      </div>
      {links.length ? (
        <div className="flex shrink-0 gap-4 text-sm font-bold text-primary">
          {links.map((l) => <Link key={l.href} href={l.href}>{l.label} →</Link>)}
        </div>
      ) : null}
    </div>
  );
}
