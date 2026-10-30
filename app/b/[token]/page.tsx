import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { Icon, type IconName } from "@/components/icons";
import { ProfileBadge } from "@/components/ui";
import { MARITAL, RELIGION, biodataNo, bn, heightLabel } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { publicBiodata } from "@/lib/services/share";
import { ageFromYear } from "@/lib/time";

export const metadata: Metadata = { title: "বায়োডাটা", robots: { index: false, follow: false } };

/**
 * The public, read-only biodata a family opens from a link the ghotok sent. No sign-in: the token in the URL is
 * the key, and lib/services/share.ts decides what is shown. Public in proxy.ts.
 */
export default async function PublicBiodataPage(props: PageProps<"/b/[token]">) {
  const { token } = await props.params;
  const b = await publicBiodata(getDb(), token);
  if (!b) notFound();
  const no = biodataNo(b.kind, b.code);
  const facts: [IconName, string, string][] = [
    ["calendar", "বয়স", `${bn(ageFromYear(b.birthYear))} বছর`],
    ["rings", "বৈবাহিক অবস্থা", MARITAL[b.maritalStatus]],
    ["ruler", "উচ্চতা", b.heightCm ? heightLabel(b.heightCm) : ""],
    ["people", "ধর্ম", RELIGION[b.religion]],
    ["location", "ঠিকানা", [b.upazila, b.district].filter(Boolean).join(", ")],
    ["school", "শিক্ষা", b.education ?? ""],
    ["briefcase", "পেশা", b.profession ?? ""],
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4 lg:h-16">
          <span className="flex items-center gap-2 font-display text-lg font-extrabold">
            <span aria-hidden className="grid size-8 place-items-center rounded-xl bg-primary text-base text-on-primary">আ</span>আলতা
          </span>
          <span className="text-sm text-muted">ঘটকের শেয়ার করা বায়োডাটা</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 lg:grid lg:grid-cols-[18rem_1fr] lg:items-start lg:gap-6 lg:py-10">
        <section className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface p-6 text-center">
          <Avatar kind={b.kind} className="size-24" />
          <div>
            <p className="text-sm text-muted">বায়োডাটা নম্বর</p>
            <h1 className="font-display text-2xl font-bold">{no}</h1>
          </div>
          <ProfileBadge status={b.status} />
          <dl className="mt-2 flex w-full flex-col divide-y divide-line text-sm">
            {facts.filter(([, , value]) => value).map(([icon, label, value]) => (
              <div key={label} className="flex items-center gap-3 py-2.5">
                <dt className="flex flex-1 items-center gap-2 text-muted"><Icon name={icon} size={16} className="text-primary" />{label}</dt>
                <dd className="text-right font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="flex flex-col gap-5">
          {b.familyDetails ? <Block icon="people" title="পরিবার" text={b.familyDetails} /> : null}
          {b.expectations ? <Block icon="heart" title="যেমন চান" text={b.expectations} /> : null}
          <section className="flex flex-col gap-3 rounded-3xl border border-primary-soft bg-primary-soft/40 p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-bold"><Icon name="phone" size={18} className="text-primary" />আগ্রহী হলে ঘটকের সাথে কথা বলুন</h2>
            <p className="text-sm text-muted">নাম, ছবি আর পরিবারের যোগাযোগ ঘটকের মাধ্যমে, দুই পক্ষের সম্মতিতে জানানো হয়।</p>
            <p className="font-bold">{b.ghotok.name}</p>
            <a href={`tel:${b.ghotok.phone}`} className="inline-flex min-h-12 w-fit items-center gap-2 rounded-2xl bg-primary px-5 font-bold text-on-primary">
              <Icon name="phone" size={18} />{bn(b.ghotok.phone)}
            </a>
          </section>
        </div>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-muted">আলতা · বিশ্বস্ত ঘটকালির খাতা</footer>
    </div>
  );
}

function Block({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <section className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 font-display text-base font-bold"><Icon name={icon} size={18} className="text-primary" />{title}</h2>
      <p className="whitespace-pre-line">{text}</p>
    </section>
  );
}
