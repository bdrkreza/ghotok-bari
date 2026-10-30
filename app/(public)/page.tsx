import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { ContactButtons, HowItWorks } from "@/components/site";
import { ThemeButton } from "@/components/theme";
import { outlineButton, primaryButton, quietButton } from "@/components/ui";
import { getSessionUser, homeFor } from "@/lib/auth/session";
import { bn } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { publicSite } from "@/lib/services/site";

const PROMISES: { icon: IconName; title: string; text: string }[] = [
  { icon: "lock", title: "নাম-ছবি গোপন", text: "তালিকায় শুধু বয়স, শিক্ষা, পেশা আর এলাকা; যোগাযোগ ঘটকের মাধ্যমে" },
  { icon: "people", title: "পরিবারের সম্মতিতে", text: "প্রতিটি ধাপে দুই পরিবার জানে, ঘটক মাঝখানে থাকেন" },
  { icon: "shield", title: "যাচাই করা বায়োডাটা", text: "প্রতিটি বায়োডাটা ঘটক নিজে দেখে তবেই তালিকায় তোলেন" },
];

/**
 * The ghotok's front page, for anyone who has the address: who the ghotok is, how many people are looking, how it
 * works, and how to get in touch. Signed-in people go straight to their own screen.
 */
export default async function FrontPage() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user.role));
  const site = await publicSite(getDb());
  if (!site) redirect("/setup");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4 lg:h-18 lg:max-w-6xl lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-display text-lg font-extrabold">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-base text-on-primary lg:size-10 lg:text-lg">ঘ</span>
            <span className="truncate">{site.name}</span>
          </Link>
          <nav aria-label="অ্যাকাউন্ট" className="flex shrink-0 items-center gap-2">
            <ThemeButton />
            <Link href="/login" className={`${quietButton} min-h-10 px-3 text-sm`}>লগইন</Link>
            <Link href="/register" className={`${primaryButton} hidden min-h-10 px-3 text-sm sm:inline-flex`}>রেজিস্টার</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6 lg:max-w-6xl lg:gap-10 lg:px-8 lg:py-12">
        <section className="flex flex-col gap-6 rounded-3xl border border-primary-soft bg-linear-to-br from-primary-soft/60 via-bg to-surface p-5 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center lg:gap-10 lg:p-12">
          <div className="flex flex-col items-start gap-4">
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">{site.tagline}</span>
            <h1 className="font-display text-3xl/[1.2] font-extrabold text-balance lg:text-5xl/[1.15]">{site.name}</h1>
            <p className="text-muted lg:text-lg">{site.about}</p>
            {site.address ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-muted"><Icon name="location" size={18} className="text-primary" />{site.address}</p>
            ) : null}
            <div className="grid w-full grid-cols-2 gap-3 sm:flex">
              <Link href="/register" className={primaryButton}>রেজিস্টার করুন</Link>
              <Link href="/login" className={outlineButton}>লগইন</Link>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <Count icon="groom" value={site.patro} label="পাত্র খুঁজছে" />
            <Count icon="bride" value={site.patri} label="পাত্রী খুঁজছে" />
          </dl>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-primary">কীভাবে কাজ করে</p>
            <h2 className="font-display text-xl font-bold lg:text-2xl">তিন ধাপে</h2>
          </div>
          <HowItWorks />
        </section>

        <section aria-label="প্রতিশ্রুতি" className="grid gap-4 rounded-3xl bg-sky/40 p-5 sm:grid-cols-3 lg:p-6">
          {PROMISES.map((p) => (
            <div key={p.title} className="flex items-start gap-4">
              <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-bg"><Icon name={p.icon} size={22} /></span>
              <span className="flex flex-col">
                <span className="font-bold">{p.title}</span>
                <span className="text-sm text-muted">{p.text}</span>
              </span>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:p-8">
          <div className="flex items-center gap-4">
            <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-2xl font-bold text-primary">ঘ</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">ঘটক</p>
              <p className="font-display text-xl font-bold">{site.ghotokName}</p>
              <p className="text-sm text-muted">ফোনে বা WhatsApp-এ সরাসরি কথা বলুন; বায়োডাটা দিতে সাহায্যও পাবেন।</p>
            </div>
          </div>
          <ContactButtons phone={site.phone} whatsapp={site.whatsapp} className="lg:w-96 lg:shrink-0" />
        </section>
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-md px-4 py-5 text-center text-sm text-muted lg:max-w-6xl lg:px-8">{site.name} · আলতা দিয়ে তৈরি</p>
      </footer>
    </div>
  );
}

function Count({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 lg:p-5">
      <span aria-hidden className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={icon} size={22} /></span>
      <dd className="font-display text-3xl font-bold tabular-nums lg:text-4xl">{bn(value)}</dd>
      <dt className="text-sm text-muted">{label}</dt>
    </div>
  );
}
