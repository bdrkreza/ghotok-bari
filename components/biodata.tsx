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
 * A biodata as a family sees it: a card with the number, the ghotok's check and the facts asked first, then the
 * family, religious practice, the "after marriage" answers and the match hoped for, then whatever the page puts
 * beside it (how to reach the ghotok). Used by the public link and the signed-in view.
 */
export function FamilyBiodata({ b, t, aside }: { b: FamilyView; t: T; aside?: ReactNode }) {
  const facts: [IconName, string, string][] = [
    ["calendar", t.t("facts.age"), t.years(ageFromYear(b.birthYear))],
    ["rings", t.t("facts.marital"), t.t(`marital.${b.maritalStatus}`)],
    ["ruler", t.t("facts.height"), b.heightCm ? t.height(b.heightCm) : ""],
    ["bride", t.t("facts.complexion"), b.complexion ? t.t(`complexion.${b.complexion}`) : ""],
    ["ruler", t.t("facts.weight"), b.weightKg ? t.t("facts.kg", { n: b.weightKg }) : ""],
    ["heart", t.t("facts.blood"), b.bloodGroup ?? ""],
    ["people", t.t("facts.religion"), t.t(`religion.${b.religion}`)],
    ["location", t.t("facts.address"), [b.upazila, b.district].filter(Boolean).join(", ")],
    ["location", t.t("facts.presentAddress"), b.presentAddress ?? ""],
    ["school", t.t("facts.education"), [b.education, b.educationMedium ? t.t(`medium.${b.educationMedium}`) : null].filter(Boolean).join(" · ")],
    ["briefcase", t.t("facts.profession"), b.profession ?? ""],
    ["briefcase", t.t("facts.workplace"), b.workplace ?? ""],
  ];
  const family = familyTags(b, t);
  const after = afterMarriageRows(b, t);
  const wants = expectationTags(b, t);
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[18rem_1fr] lg:items-start lg:gap-6">
      <section className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface p-6 text-center">
        <Avatar kind={b.kind} className="size-24" />
        <div>
          <p className="text-sm text-muted">{t.t("bv.number")}</p>
          <h1 className="font-display text-2xl font-bold">{t.biodataNo(b.kind, b.code)}</h1>
        </div>
        <ProfileBadge status={b.status} />
        <p className="inline-flex items-center gap-1.5 rounded-full bg-pos-soft px-3 py-1 text-xs font-bold text-pos"><Icon name="check" size={14} />{trustLine(b, t)}</p>
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
        {aside}
        {family.length || b.familyDetails ? <Block icon="people" title={t.t("facts.family")} tags={family} text={b.familyDetails} /> : null}
        {b.religiousPractice ? <Block icon="shield" title={t.t("facts.religiousPractice")} text={b.religiousPractice} /> : null}
        {after.length ? (
          <Block icon="rings" title={t.t("facts.after")}>
            <dl className="flex flex-col divide-y divide-line text-sm">
              {after.map(([q, a]) => (
                <div key={q} className="flex items-start justify-between gap-4 py-2">
                  <dt className="text-muted">{q}</dt>
                  <dd className="shrink-0 text-right font-bold">{a}</dd>
                </div>
              ))}
            </dl>
          </Block>
        ) : null}
        {wants.length || b.expectations ? <Block icon="heart" title={t.t("facts.expectations")} tags={wants} text={b.expectations} /> : null}
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
function Block({ icon, title, tags = [], text, children }: { icon: IconName; title: string; tags?: string[]; text?: string | null; children?: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
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
