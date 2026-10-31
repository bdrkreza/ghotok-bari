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
  const age = expectedAge(b, t);
  if (age) tags.push(age);
  if (b.expectEducation) tags.push(t.t("facts.expectEdu", { x: t.t(`expectEdu.${b.expectEducation}`) }));
  if (b.expectMarital) tags.push(t.t(`expectMarital.${b.expectMarital}`));
  if (b.expectDistricts) tags.push(b.expectDistricts);
  return tags;
}

/** "২২ থেকে ২৮ বছর", "২৫ বছর বা বেশি", "৩২ বছর পর্যন্ত", or "" when no age was given. */
export function expectedAge(b: Pick<FamilyView, "expectAgeMin" | "expectAgeMax">, t: T): string {
  if (b.expectAgeMin !== null && b.expectAgeMax !== null) return t.t("bv.ageBetween", { a: b.expectAgeMin, b: b.expectAgeMax });
  if (b.expectAgeMin !== null) return t.t("bv.ageFrom", { n: b.expectAgeMin });
  if (b.expectAgeMax !== null) return t.t("bv.ageTo", { n: b.expectAgeMax });
  return "";
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
 * A biodata as a family sees it. Left: a profile card with a coloured head, the picture over it, the number, the
 * status, the ghotok's check, the facts asked first, and whatever the page passes as `aside` (the buttons that reach
 * the ghotok). Right: one section per topic, each with an icon and a label / value table: address, education and
 * work, family, after marriage, the match hoped for, and who sees what. Used by the public link and the signed-in view.
 */
export function FamilyBiodata({ b, t, aside }: { b: FamilyView; t: T; aside?: ReactNode }) {
  const facts: { icon: IconName; label: string; value: string }[] = [
    { icon: "calendar", label: t.t("facts.age"), value: t.years(ageFromYear(b.birthYear)) },
    { icon: "rings", label: t.t("facts.marital"), value: t.t(`marital.${b.maritalStatus}`) },
    { icon: "ruler", label: t.t("facts.height"), value: b.heightCm ? t.height(b.heightCm) : "" },
    { icon: "sun", label: t.t("facts.complexion"), value: b.complexion ? t.t(`complexion.${b.complexion}`) : "" },
    { icon: "ruler", label: t.t("facts.weight"), value: b.weightKg ? t.t("facts.kg", { n: b.weightKg }) : "" },
    { icon: "heart", label: t.t("facts.blood"), value: b.bloodGroup ?? "" },
    { icon: "people", label: t.t("facts.religion"), value: t.t(`religion.${b.religion}`) },
    { icon: "briefcase", label: t.t("facts.profession"), value: b.profession ?? "" },
  ];
  const chips = (items: string[]) => (
    <span className="flex flex-wrap gap-1.5">{items.map((x) => <span key={x} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-sm font-bold text-primary">{x}</span>)}</span>
  );
  const prose = (text: string) => <span className="font-normal whitespace-pre-line">{text}</span>;
  const siblings = familyTags({ brothers: b.brothers, sisters: b.sisters, familyStatus: null }, t);
  const districts = (b.expectDistricts ?? "").split(/[,،]/).map((s) => s.trim()).filter(Boolean);
  const after = afterMarriageRows(b, t);
  const age = expectedAge(b, t);

  const address: Row[] = [
    { label: t.t("bv.permanentAddress"), value: <>{[b.upazila, b.district].filter(Boolean).join(", ")}<small className="block text-sm font-normal text-muted">{t.t("bv.villageHidden")}</small></> },
    { label: t.t("facts.presentAddress"), value: b.presentAddress },
  ];
  const work: Row[] = [
    { label: t.t("facts.medium"), value: b.educationMedium ? t.t(`medium.${b.educationMedium}`) : null },
    { label: t.t("form.education"), value: b.education },
    { label: t.t("facts.profession"), value: b.profession },
    { label: t.t("facts.workplace"), value: b.workplace },
  ];
  const family: Row[] = [
    { label: t.t("bv.siblings"), value: siblings.length ? chips(siblings) : null },
    { label: t.t("facts.familyStatus"), value: b.familyStatus ? t.t(`famStatus.${b.familyStatus}`) : null },
    { label: t.t("form.family"), value: b.familyDetails ? prose(b.familyDetails) : null },
    { label: t.t("facts.religiousPractice"), value: b.religiousPractice },
  ];
  const wants: Row[] = [
    { label: t.t("facts.age"), value: age },
    { label: t.t("form.education"), value: b.expectEducation ? t.t("facts.expectEdu", { x: t.t(`expectEdu.${b.expectEducation}`) }) : null },
    { label: t.t("facts.marital"), value: b.expectMarital ? t.t(`expectMarital.${b.expectMarital}`) : null },
    { label: t.t("form.district"), value: districts.length ? chips(districts) : null },
    { label: t.t("bv.inOwnWords"), value: b.expectations ? prose(b.expectations) : null },
  ];

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <aside className="overflow-hidden rounded-3xl border border-line bg-surface lg:sticky lg:top-24">
        <div aria-hidden className="biodata-head h-24" />
        <div className="-mt-12 flex justify-center">
          <span className="rounded-full border-4 border-surface bg-surface"><Avatar kind={b.kind} className="size-24" /></span>
        </div>
        <div className="flex flex-col items-center gap-1.5 px-5 pt-3 text-center">
          <p className="text-xs text-muted">{t.t("bv.number")}</p>
          <p className="font-display text-3xl font-extrabold leading-none">{t.biodataNo(b.kind, b.code)}</p>
          <div className="mt-1 flex flex-wrap justify-center gap-1.5">
            <ProfileBadge status={b.status} />
            <span className="inline-flex items-center gap-1 rounded-full bg-pos-soft px-2.5 py-0.5 text-xs font-bold text-pos"><Icon name="check" size={13} />{trustLine(b, t)}</span>
          </div>
        </div>
        <dl className="flex flex-col divide-y divide-line px-5 pt-3 text-sm">
          {facts.filter((f) => f.value).map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-2.5">
              <dt className="flex flex-1 items-center gap-2 text-muted"><Icon name={icon} size={15} className="text-primary" />{label}</dt>
              <dd className="text-right font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        {aside ? <div className="flex flex-col gap-3 px-5 pt-3 pb-5">{aside}</div> : <div className="pb-3" />}
      </aside>

      <div className="flex flex-col gap-5">
        <Section icon="location" title={t.t("facts.address")} rows={address} />
        <Section icon="school" title={t.t("form.s2")} rows={work} />
        <Section icon="people" title={t.t("facts.family")} rows={family} />
        <Section icon="home" title={t.t("facts.after")} rows={after.map(([label, value]) => ({ label, value }))} />
        <Section icon="heart" title={t.t("facts.expectations")} rows={wants} />
        <section className="flex flex-col gap-3 rounded-3xl border border-dashed border-line bg-surface p-5 lg:p-6">
          <SectionHead icon="shield" title={t.t("aside.whoTitle")} />
          <p className="text-sm text-muted">{t.t("bv.whoSees")}</p>
        </section>
      </div>
    </div>
  );
}

interface Row { label: string; value: ReactNode | null | undefined }

/** One topic: an icon, a title and a label / value table. Rows without a value are left out; an empty topic is not shown. */
function Section({ icon, title, rows }: { icon: IconName; title: string; rows: Row[] }) {
  const shown = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== "");
  if (!shown.length) return null;
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 lg:p-6">
      <SectionHead icon={icon} title={title} />
      <dl className="overflow-hidden rounded-2xl border border-line">
        {shown.map((r, i) => (
          <div key={r.label} className="grid border-t border-line first:border-t-0 sm:grid-cols-[13rem_minmax(0,1fr)]">
            <dt className="bg-sunk px-4 pt-2.5 pb-1 text-sm font-semibold text-muted sm:py-3.5">{r.label}</dt>
            <dd className={`bg-sunk px-4 pt-1 pb-3 font-semibold sm:py-3.5 ${i % 2 ? "sm:bg-sunk/45" : "sm:bg-transparent"}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SectionHead({ icon, title }: { icon: IconName; title: string }) {
  return (
    <header className="flex items-center gap-3">
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={icon} size={20} /></span>
      <h2 className="font-display text-xl font-bold">{title}</h2>
    </header>
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
