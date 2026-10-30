import Link from "next/link";
import { HomeSearch } from "@/components/home-search";
import { Icon, type IconName } from "@/components/icons";
import { Empty, ProfileBadge, ProposalBadge, outlineButton, primaryButton, quietButton } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { KIND_LABEL, bn, initial, taka } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { dashboard } from "@/lib/services/dashboard";

const PROMISES: { icon: IconName; title: string; text: string }[] = [
  { icon: "shield", title: "তথ্য গোপন থাকে", text: "ছবি ও যোগাযোগ শুধু অনুমতিতে" },
  { icon: "people", title: "পরিবারের সম্মতিতে", text: "প্রতিটি ধাপে পরিবার যুক্ত" },
  { icon: "card", title: "পরিষ্কার হিসাব", text: "চুক্তি, জমা আর বাকি এক জায়গায়" },
];

export default async function HomePage() {
  const user = await requireUser();
  const d = await dashboard(getDb(), user.id);
  // share of the agreed fees already in hand
  const pct = d.money.chukti > 0 ? Math.min(100, Math.round((d.money.joma / d.money.chukti) * 100)) : 0;

  return (
    <>
      <section className="flex flex-col gap-5 rounded-3xl border border-primary-soft bg-linear-to-br from-primary-soft/60 via-bg to-surface p-5 lg:gap-7 lg:p-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="flex flex-col items-start gap-3">
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">ঘটকের ড্যাশবোর্ড</span>
            <h1 className="font-display text-3xl/[1.2] font-extrabold lg:text-5xl/[1.2]">
              আসসালামু আলাইকুম,<br /><span className="text-primary">{user.name}</span>
            </h1>
            <p className="text-muted lg:text-lg">
              {d.live ? `আজ ${bn(d.live)}টি প্রস্তাব আলোচনায় আছে।` : "এখন কোনো প্রস্তাব আলোচনায় নেই।"} নতুন প্রোফাইল যোগ করুন বা নিচে খুঁজে দেখুন।
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:flex lg:shrink-0">
            <Link href="/profiles/new?kind=patro" className={outlineButton}><Icon name="plus" size={18} />নতুন পাত্র</Link>
            <Link href="/profiles/new?kind=patri" className={primaryButton}><Icon name="plus" size={18} />নতুন পাত্রী</Link>
          </div>
        </div>
        <HomeSearch places={d.places} />
      </section>

      <section aria-label="এক নজরে" className="grid grid-cols-2 gap-1 rounded-3xl border border-line bg-surface p-2 lg:grid-cols-4">
        <Stat icon="groom" value={bn(d.patro)} label="পাত্র খুঁজছে" href="/patro" />
        <Stat icon="bride" value={bn(d.patri)} label="পাত্রী খুঁজছে" href="/patri" />
        <Stat icon="heart" value={bn(d.live)} label="চলমান প্রস্তাব" href="/proposals" />
        <Stat icon="check" value={bn(d.fixed)} label="বিয়ে ঠিক / হয়েছে" href="/proposals?status=all" />
      </section>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8">
        <section className="flex flex-col gap-4">
          <SectionHead eyebrow="চলমান প্রস্তাব" title="আলোচনায় থাকা জুটি" links={[{ href: "/proposals", label: "সব প্রস্তাব দেখুন" }]} />
          {d.recent.length ? (
            <ul className="flex flex-col gap-3">
              {d.recent.map((p) => (
                <li key={p.id}>
                  <Link href={`/proposals/${p.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-primary/40">
                    <span aria-hidden className="flex shrink-0 -space-x-3">
                      <span className="grid size-12 place-items-center rounded-full bg-sky font-display text-lg font-bold text-sky-ink ring-2 ring-surface">{initial(p.patro.name)}</span>
                      <span className="grid size-12 place-items-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary ring-2 ring-surface">{initial(p.patri.name)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{p.patro.name} ও {p.patri.name}</span>
                      <span className="block truncate text-sm text-muted">{p.patro.district} · {p.patri.district}</span>
                    </span>
                    <ProposalBadge status={p.status} />
                    <Icon name="chevronRight" size={18} className="text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty action={<Link href="/proposals/new" className={quietButton}>প্রথম প্রস্তাব দিন</Link>}>এখনো কোনো প্রস্তাব চলছে না।</Empty>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <SectionHead eyebrow="টাকার হিসাব" title="আদায়ের অবস্থা" />
          <div className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-5 lg:p-6">
            <div>
              <p className="text-sm text-muted">মোট চুক্তি</p>
              <p className="font-display text-3xl font-bold tabular-nums lg:text-4xl">{taka(d.money.chukti)}</p>
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
                <p className="font-display text-xl font-bold tabular-nums text-pos">{taka(d.money.joma)}</p>
              </div>
              <div className="rounded-2xl bg-neg-soft p-4">
                <p className="text-sm font-semibold text-neg">বাকি</p>
                <p className="font-display text-xl font-bold tabular-nums text-neg">{taka(d.money.baki)}</p>
              </div>
            </div>
            <Link href="/hisab" className={outlineButton}>পুরো হিসাব দেখুন →</Link>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="প্রোফাইল" title="সাম্প্রতিক প্রোফাইল" links={[{ href: "/patro", label: "সব পাত্র" }, { href: "/patri", label: "সব পাত্রী" }]} />
        {d.people.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {d.people.map((p) => (
              <li key={p.id}>
                <Link href={`/profiles/${p.id}`} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-2.5 hover:border-primary/40">
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-sunk">
                    {p.photoUrl ? (
                      // a plain <img>: the link may point anywhere, and next/image would need every host listed in config
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="flex size-full flex-col items-center justify-center gap-1 text-xs text-muted"><Icon name="lock" size={22} />ছবি গোপন</span>
                    )}
                    <span className="absolute top-2 right-2"><ProfileBadge status={p.status} /></span>
                  </span>
                  <span className="flex flex-col px-1 pb-1">
                    <span className="truncate font-bold">{p.name}</span>
                    <span className="truncate text-sm text-muted">{KIND_LABEL[p.kind]} · {p.district}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty action={<Link href="/profiles/new?kind=patro" className={quietButton}><Icon name="plus" size={18} />প্রথম জনকে যোগ করুন</Link>}>এখনো কাউকে যোগ করা হয়নি।</Empty>
        )}
      </section>

      <section aria-label="আলতার প্রতিশ্রুতি" className="grid gap-4 rounded-3xl bg-sky/40 p-5 sm:grid-cols-3 lg:p-6">
        {PROMISES.map((p) => (
          <div key={p.title} className="flex items-center gap-4">
            <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-bg"><Icon name={p.icon} size={22} /></span>
            <span className="flex flex-col">
              <span className="font-bold">{p.title}</span>
              <span className="text-sm text-muted">{p.text}</span>
            </span>
          </div>
        ))}
      </section>
    </>
  );
}

/** One of the four numbers at a glance; the whole thing links to its list. */
function Stat({ icon, value, label, href }: { icon: IconName; value: string; label: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-2xl p-3 hover:bg-sunk lg:p-4">
      <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={icon} size={24} /></span>
      <span className="flex min-w-0 flex-col">
        <span className="font-display text-3xl font-bold tabular-nums">{value}</span>
        <span className="truncate text-sm text-muted">{label}</span>
      </span>
    </Link>
  );
}

/** A small red eyebrow over the section title, with "see all" links on the right. */
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
