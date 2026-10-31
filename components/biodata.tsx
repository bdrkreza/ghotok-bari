import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import { Icon, type IconName } from "./icons";
import { ContactButtons } from "./site";
import { Card, ProfileBadge } from "./ui";
import type { T } from "@/lib/i18n";
import type { FamilyView } from "@/lib/services/share";
import type { PublicSite } from "@/lib/services/site";
import { ageFromYear } from "@/lib/time";

export type { FamilyView };

/** The family in numbers, as chips: "২ ভাই", "১ বোন", "মধ্যবিত্ত". */
export function familyTags(b: Pick<FamilyView, "brothers" | "sisters" | "familyStatus">, t: T): string[] {
  const tags: string[] = [];
  if (b.brothers !== null) tags.push(t.t("facts.brothers", { n: b.brothers }));
  if (b.sisters !== null) tags.push(t.t("facts.sisters", { n: b.sisters }));
  if (b.familyStatus) tags.push(t.t(`famStatus.${b.familyStatus}`));
  return tags;
}

/** The match hoped for, as chips: age range, least education, marital status, districts. */
export function expectationTags(b: Pick<FamilyView, "expectAgeMin" | "expectAgeMax" | "expectEducation" | "expectMarital" | "expectDistricts">, t: T): string[] {
  const tags: string[] = [];
  if (b.expectAgeMin !== null && b.expectAgeMax !== null) tags.push(t.t("facts.expectAge", { a: b.expectAgeMin, b: b.expectAgeMax }));
  else if (b.expectAgeMin !== null) tags.push(t.t("facts.expectAgeMin", { n: b.expectAgeMin }));
  else if (b.expectAgeMax !== null) tags.push(t.t("facts.expectAgeMax", { n: b.expectAgeMax }));
  if (b.expectEducation) tags.push(t.t("facts.expectEdu", { x: t.t(`expectEdu.${b.expectEducation}`) }));
  if (b.expectMarital) tags.push(t.t(`expectMarital.${b.expectMarital}`));
  if (b.expectDistricts) tags.push(b.expectDistricts);
  return tags;
}

/** The "after marriage" answers as question / answer pairs, only those given; the questions differ by kind. */
export function afterMarriageRows(b: Pick<FamilyView, "kind" | "afterStudy" | "afterJob" | "afterHome" | "dowry" | "jointFamily">, t: T): [string, string][] {
  const rows: [string, string][] = [];
  if (b.afterStudy) rows.push([t.t(`form.afterStudy.${b.kind}`), t.t(`choice.${b.afterStudy}`)]);
  if (b.afterJob) rows.push([t.t(`form.afterJob.${b.kind}`), t.t(`choice.${b.afterJob}`)]);
  if (b.kind === "patro") {
    if (b.afterHome) rows.push([t.t("form.afterHome"), t.t(`afterHome.${b.afterHome}`)]);
    if (b.dowry) rows.push([t.t("form.dowry"), t.t(`dowry.${b.dowry}`)]);
  } else if (b.jointFamily) rows.push([t.t("form.jointFamily"), t.t(`choice.${b.jointFamily}`)]);
  return rows;
}

/** The trust line under the number: checked by the ghotok on a date (a family's entry), or written by the ghotok (their own). */
export const trustLine = (b: Pick<FamilyView, "approvedAt" | "createdAt">, t: T): string =>
  b.approvedAt ? t.t("bv.verified", { date: t.date(b.approvedAt) }) : t.t("bv.ghotokWrote", { date: t.date(b.createdAt) });

/** Beside the family's biodata form on a wide screen: how to fill it in, who sees what, and the ghotok to call. */
export function BiodataFormAside({ site, t }: { site: PublicSite | null; t: T }) {
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
      <Card title={t.t("aside.howTitle")}>
        <ul className="flex flex-col gap-2 text-sm text-muted">
          {(["aside.tip1", "aside.tip2", "aside.tip3"] as const).map((k) => (
            <li key={k} className="flex items-start gap-2"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-pos" />{t.t(k)}</li>
          ))}
        </ul>
      </Card>
      <Card title={t.t("aside.whoTitle")}>
        <p className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-mint-ink"><Icon name="eye" size={12} />{t.t("form.seenAll")}</span>
          <span className="text-muted">{t.t("aside.seenList")}</span>
        </p>
        <p className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-sunk px-2 py-0.5 text-[11px] font-bold text-muted"><Icon name="lock" size={12} />{t.t("form.seenGhotok")}</span>
          <span className="text-muted">{t.t("aside.ghotokList")}</span>
        </p>
        <p className="text-sm text-muted">{t.t("aside.whoText")}</p>
      </Card>
      {site ? (
        <Card title={t.t("aside.stuckTitle")}>
          <p className="text-sm text-muted">{t.t("aside.stuckText", { name: site.ghotokName })}</p>
          <ContactButtons phone={site.phone} whatsapp={site.whatsapp} t={t} />
        </Card>
      ) : null}
    </aside>
  );
}

/**
 * A biodata as a family sees it. First a summary card: the number, the status, the ghotok's check, and every fact
 * in a grid that reads at a glance. Then the family's own words: family, the match hoped for, the "after marriage"
 * answers. Whatever the page passes as `aside` (how to reach the ghotok) sits right under the summary on a phone and
 * stays in view down the right on a wide screen. Used by the public link and the signed-in view.
 */
export function FamilyBiodata({ b, t, aside }: { b: FamilyView; t: T; aside?: ReactNode }) {
  const facts: { icon: IconName; label: string; value: string; wide?: boolean }[] = [
    { icon: "calendar", label: t.t("facts.age"), value: t.years(ageFromYear(b.birthYear)) },
    { icon: "rings", label: t.t("facts.marital"), value: t.t(`marital.${b.maritalStatus}`) },
    { icon: "ruler", label: t.t("facts.height"), value: b.heightCm ? t.height(b.heightCm) : "" },
    { icon: "people", label: t.t("facts.religion"), value: t.t(`religion.${b.religion}`) },
    { icon: "sun", label: t.t("facts.complexion"), value: b.complexion ? t.t(`complexion.${b.complexion}`) : "" },
    { icon: "ruler", label: t.t("facts.weight"), value: b.weightKg ? t.t("facts.kg", { n: b.weightKg }) : "" },
    { icon: "heart", label: t.t("facts.blood"), value: b.bloodGroup ?? "" },
    { icon: "location", label: t.t("facts.address"), value: [b.upazila, b.district].filter(Boolean).join(", ") },
    { icon: "location", label: t.t("facts.presentAddress"), value: b.presentAddress ?? "" },
    { icon: "school", label: t.t("facts.education"), value: [b.education, b.educationMedium ? t.t(`medium.${b.educationMedium}`) : null].filter(Boolean).join(" · ") },
    { icon: "briefcase", label: t.t("facts.profession"), value: b.profession ?? "" },
    { icon: "briefcase", label: t.t("facts.workplace"), value: b.workplace ?? "" },
    { icon: "shield", label: t.t("facts.religiousPractice"), value: b.religiousPractice ?? "", wide: true },
  ];
  const family = familyTags(b, t);
  const after = afterMarriageRows(b, t);
  const wants = expectationTags(b, t);
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-6">
      <section className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-5 lg:col-start-1 lg:row-start-1 lg:p-6">
        <div className="flex items-center gap-4 lg:gap-5">
          <Avatar kind={b.kind} className="size-20 lg:size-24" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-primary">{t.t("bv.number")}</p>
            <p className="font-display text-3xl font-extrabold lg:text-4xl">{t.biodataNo(b.kind, b.code)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ProfileBadge status={b.status} />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-soft px-2.5 py-0.5 text-xs font-bold text-pos"><Icon name="check" size={14} />{trustLine(b, t)}</span>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-5 sm:grid-cols-3 lg:grid-cols-4">
          {facts.filter((f) => f.value).map(({ icon, label, value, wide }) => (
            <div key={label} className={`min-w-0 ${wide ? "col-span-2 sm:col-span-3 lg:col-span-4" : ""}`}>
              <dt className="flex items-center gap-1.5 text-xs font-bold text-muted"><Icon name={icon} size={14} className="text-primary" />{label}</dt>
              <dd className="mt-0.5 font-semibold wrap-break-word">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {aside ? <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:row-span-2">{aside}</div> : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:col-start-1 lg:row-start-2">
        {family.length || b.familyDetails ? <Block icon="people" title={t.t("facts.family")} tags={family} text={b.familyDetails} /> : null}
        {wants.length || b.expectations ? <Block icon="heart" title={t.t("facts.expectations")} tags={wants} text={b.expectations} /> : null}
        {after.length ? (
          <Block icon="rings" title={t.t("facts.after")} className="sm:col-span-2">
            <dl className="grid gap-x-8 sm:grid-cols-2">
              {after.map(([q, a]) => (
                <div key={q} className="flex items-start justify-between gap-4 border-t border-line py-2.5 text-sm">
                  <dt className="text-muted">{q}</dt>
                  <dd className="shrink-0 text-right font-bold">{a}</dd>
                </div>
              ))}
            </dl>
          </Block>
        ) : null}
      </div>
    </div>
  );
}

/** A small card of someone else's biodata for a family: number, the first facts, and a link to the full view. */
export function FamilyBiodataCard({ b, t }: { b: FamilyView & { id: string }; t: T }) {
  const no = t.biodataNo(b.kind, b.code);
  const facts = [
    t.years(ageFromYear(b.birthYear)),
    b.complexion ? t.t(`complexion.${b.complexion}`) : "",
    [b.upazila, b.district].filter(Boolean).join(", "),
    b.profession ?? b.education ?? "",
  ].filter(Boolean);
  return (
    <Link href={`/biodata/${b.id}`} aria-label={t.t("list.viewAria", { title: no })} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 hover:border-primary/40">
      <Avatar kind={b.kind} className="size-14" />
      <span className="min-w-0 flex-1">
        <span className="block font-display font-bold">{no}</span>
        <span className="block truncate text-sm text-muted">{facts.join(" · ")}</span>
      </span>
      <Icon name="chevronRight" size={18} className="shrink-0 text-muted" />
    </Link>
  );
}

/** One titled card: a row of chips, a paragraph, or anything else, in that order. */
function Block({ icon, title, tags = [], text, children, className = "" }: { icon: IconName; title: string; tags?: string[]; text?: string | null; children?: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5 ${className}`}>
      <h2 className="flex items-center gap-2 font-display text-base font-bold"><Icon name={icon} size={18} className="text-primary" />{title}</h2>
      {tags.length ? (
        <p className="flex flex-wrap gap-1.5">
          {tags.map((x) => <span key={x} className="rounded-full bg-sunk px-2.5 py-0.5 text-sm font-semibold">{x}</span>)}
        </p>
      ) : null}
      {text ? <p className="whitespace-pre-line">{text}</p> : null}
      {children}
    </section>
  );
}
