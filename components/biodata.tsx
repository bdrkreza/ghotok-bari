import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import { Icon, type IconName } from "./icons";
import { ContactButtons } from "./site";
import { Card, ProfileBadge } from "./ui";
import type { Profile } from "@/lib/db/schema";
import type { Key, T } from "@/lib/i18n";
import type { FamilyView } from "@/lib/services/share";
import type { PublicSite } from "@/lib/services/site";
import { ageFromYear } from "@/lib/time";

export type { FamilyView };

/**
 * What only the ghotok and the family who wrote it see. Given to FamilyBiodata, these join the same layout with a
 * lock beside each; `notes` is the ghotok's own, passed on their page only.
 */
export type PrivateFields = Pick<Profile, "name" | "fatherName" | "motherName" | "guardianName" | "guardianPhone" | "monthlyIncome" | "photoUrl" | "educationInstitution">
  & { notes?: string | null; /** uploaded photos in order, the first being the cover */ photos?: { id: string }[] };

/** "২০০৯ · বিজ্ঞান", "২০১১", "বিজ্ঞান", or null when neither was given. */
function schoolLine(year: number | null, group: string | null, t: T): string | null {
  const parts = [year ? t.n(year) : "", group ? t.t(`eduGroup.${group}` as Key) : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

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

/**
 * The "after marriage" answers as label / answer pairs, only those given. The labels are short statements for reading
 * ("স্ত্রীর চাকরি করা: হ্যাঁ"), not the form's questions; they differ by kind.
 */
export function afterMarriageRows(b: Pick<FamilyView, "kind" | "afterStudy" | "afterJob" | "afterHome" | "dowry" | "jointFamily">, t: T): [string, string][] {
  const rows: [string, string][] = [];
  if (b.afterStudy) rows.push([t.t(`bv.afterStudy.${b.kind}`), t.t(`choice.${b.afterStudy}`)]);
  if (b.afterJob) rows.push([t.t(`bv.afterJob.${b.kind}`), t.t(`choice.${b.afterJob}`)]);
  if (b.kind === "patro") {
    if (b.afterHome) rows.push([t.t("bv.afterHome"), t.t(`afterHome.${b.afterHome}`)]);
    if (b.dowry) rows.push([t.t("bv.dowry"), t.t(`dowry.${b.dowry}`)]);
  } else if (b.jointFamily) rows.push([t.t("bv.jointFamily"), t.t(`choice.${b.jointFamily}`)]);
  return rows;
}

/** The trust mark under the number: checked by the ghotok on a date (a family's entry), or written by the ghotok (their own). */
export const trustMark = (b: Pick<FamilyView, "approvedAt" | "createdAt">, t: T): { label: string; date: string } =>
  b.approvedAt ? { label: t.t("bv.checked"), date: t.date(b.approvedAt) } : { label: t.t("bv.wrote"), date: t.date(b.createdAt) };

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

interface Props {
  b: FamilyView;
  t: T;
  /** at the foot of the profile card: the buttons that reach the ghotok, or the page's own state and actions */
  aside?: ReactNode;
  /** the full biodata (the family's own, or the ghotok's page): name, parents, guardian, income, photo, notes */
  full?: PrivateFields;
  /** in place of the status and trust line under the number, e.g. where a family's own entry stands with the ghotok */
  badges?: ReactNode;
  /** after the topics in the right-hand column: the page's own cards (proposals, sharing, deleting) */
  more?: ReactNode;
  /** someone else's photos, where their family agreed to show them (the full biodata passes them in `full`) */
  photos?: { id: string }[];
}

/**
 * A biodata laid out like a paper one. Left: a profile card with a coloured head, the picture over it, the number, the
 * status, the ghotok's check, the facts asked first, and whatever the page passes as `aside`. Right: one section per
 * topic, each with an icon and a label / value table: address, education and work, family, after marriage, the match
 * hoped for, and who sees what. A family looking at someone else's (the public link, /biodata) sees FAMILY_VIEW only;
 * with `full` the same layout shows everything, the private rows marked with a lock.
 */
export function FamilyBiodata({ b, t, aside, full, badges, more, photos: shownPhotos }: Props) {
  const facts: { icon: IconName; label: string; value: string; locked?: boolean }[] = [
    { icon: "calendar", label: t.t("facts.age"), value: full ? t.t("facts.ageWithYear", { n: ageFromYear(b.birthYear), year: b.birthYear }) : t.years(ageFromYear(b.birthYear)) },
    { icon: "rings", label: t.t("facts.marital"), value: t.t(`marital.${b.maritalStatus}`) },
    { icon: "ruler", label: t.t("facts.height"), value: b.heightCm ? t.height(b.heightCm) : "" },
    { icon: "sun", label: t.t("facts.complexion"), value: b.complexion ? t.t(`complexion.${b.complexion}`) : "" },
    { icon: "ruler", label: t.t("facts.weight"), value: b.weightKg ? t.t("facts.kg", { n: b.weightKg }) : "" },
    { icon: "heart", label: t.t("facts.blood"), value: b.bloodGroup ?? "" },
    { icon: "people", label: t.t("facts.religion"), value: t.t(`religion.${b.religion}`) },
    { icon: "briefcase", label: t.t("facts.profession"), value: b.profession ?? "" },
    { icon: "wallet", label: t.t("facts.income"), value: full?.monthlyIncome ? t.money(full.monthlyIncome) : "", locked: true },
  ];
  const chips = (items: string[]) => (
    <span className="flex flex-wrap gap-1.5">{items.map((x) => <span key={x} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-sm font-bold text-primary">{x}</span>)}</span>
  );
  const prose = (text: string) => <span className="font-normal whitespace-pre-line">{text}</span>;
  const siblings = familyTags({ brothers: b.brothers, sisters: b.sisters, familyStatus: null }, t);
  const districts = (b.expectDistricts ?? "").split(/[,،]/).map((s) => s.trim()).filter(Boolean);
  const after = afterMarriageRows(b, t);
  const age = expectedAge(b, t);
  const trust = trustMark(b, t);
  const no = t.biodataNo(b.kind, b.code);
  const gallery = full?.photos ?? shownPhotos ?? [];

  const address: Row[] = [
    { label: t.t("bv.permanentAddress"), value: [b.village, b.upazila, b.district].filter(Boolean).join(", ") },
    { label: t.t("facts.presentAddress"), value: b.presentAddress },
  ];
  const work: Row[] = [
    { label: t.t("facts.medium"), value: b.educationMedium ? t.t(`medium.${b.educationMedium}`) : null },
    { label: t.t("facts.eduLevel"), value: b.educationLevel ? `${t.t(`eduLevel.${b.educationLevel}`)}${b.educationStudying ? ` (${t.t("facts.studying")})` : ""}` : null },
    { label: t.t("facts.ssc"), value: schoolLine(b.sscYear, b.sscGroup, t) },
    { label: t.t("facts.hsc"), value: schoolLine(b.hscYear, b.hscGroup, t) },
    { label: t.t("form.education"), value: b.education },
    { label: t.t("facts.subject"), value: b.educationSubject },
    // the school or college can name the person, so only the ghotok and the family who wrote it see it
    ...(full ? [{ label: t.t("facts.institution"), value: full.educationInstitution, locked: true }] : []),
    { label: b.educationStudying ? t.t("facts.studying") : t.t("facts.eduYear"), value: b.educationYear ? (b.educationStudying ? t.t("facts.eduDue", { year: t.n(b.educationYear) }) : t.n(b.educationYear)) : null },
    { label: t.t("facts.result"), value: b.educationResult },
    { label: t.t("facts.extra"), value: b.extraQualifications ? prose(b.extraQualifications) : null },
    { label: t.t("facts.profession"), value: b.profession },
    { label: t.t("facts.workplace"), value: b.workplace },
  ];
  const guardian = full?.guardianPhone ? (
    <span className="flex flex-col">
      {full.guardianName ? <span>{full.guardianName}</span> : null}
      <a href={`tel:${full.guardianPhone}`} className="inline-flex items-center gap-1.5 font-bold text-primary"><Icon name="phone" size={15} />{t.n(full.guardianPhone)}</a>
    </span>
  ) : full?.guardianName;
  const family: Row[] = [
    // the parents' names: always on the full biodata (locked unless the family agreed), otherwise only where agreed
    ...(full || b.showParents ? [
      { label: t.t("facts.father"), value: full ? full.fatherName : b.fatherName, locked: !!full && !b.showParents },
      { label: t.t("facts.mother"), value: full ? full.motherName : b.motherName, locked: !!full && !b.showParents },
    ] : []),
    ...(full ? [{ label: t.t("facts.guardian"), value: guardian, locked: true }] : []),
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
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-6 print:grid print:grid-cols-[16rem_minmax(0,1fr)] print:items-start print:gap-4">
      <aside className="overflow-hidden rounded-3xl border border-line bg-surface lg:sticky lg:top-24">
        <div aria-hidden className="biodata-head h-21" />
        {/* the picture hangs over the head's left end, the number beside it; `relative` keeps it above the head's pattern */}
        <div className="flex items-end gap-3.5 px-5">
          <span className="relative -mt-11 print:mt-4 shrink-0 rounded-full border-4 border-surface bg-surface ring-2 ring-gold"><Avatar kind={b.kind} photoUrl={full ? full.photoUrl : b.photoUrl} className="size-22" /></span>
          <div className="min-w-0 pt-2">
            <p className="text-xs text-muted">{t.t("bv.number")}</p>
            {/* a long number ("Groom-50000") gets a smaller size and may break after the hyphen instead of being cut */}
            <p className={`font-display font-extrabold leading-none wrap-break-word ${no.length > 9 ? "text-2xl" : "text-3xl"}`}>{no}</p>
          </div>
        </div>
        {full ? <p className="flex items-center gap-1.5 px-5 pt-3 font-display text-lg font-bold">{full.name}<Locked t={t} /></p> : null}
        <div className="flex flex-col gap-1.5 px-5 pt-3">
          {badges ?? (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <ProfileBadge status={b.status} />
                <span className="inline-flex items-center gap-1 rounded-full bg-pos-soft px-2.5 py-0.5 text-xs font-bold text-pos"><Icon name="check" size={13} />{trust.label}</span>
              </div>
              <p className="text-xs text-muted">{trust.date}</p>
            </>
          )}
        </div>
        <dl className="flex flex-col divide-y divide-line px-5 pt-3 text-sm">
          {facts.filter((f) => f.value).map(({ icon, label, value, locked }) => (
            <div key={label} className="flex items-center gap-3 py-2.5">
              <dt className="flex flex-1 items-center gap-2 text-muted"><Icon name={icon} size={15} className="text-primary" />{label}{locked ? <Locked t={t} /> : null}</dt>
              <dd className="text-right font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        {aside ? <div className="flex flex-col gap-3 px-5 pt-3 pb-5">{aside}</div> : <div className="pb-3" />}
      </aside>

      <div className="flex flex-col gap-5">
        <Section t={t} icon="location" title={t.t("facts.address")} rows={address} />
        <Section t={t} icon="school" title={t.t("form.s2")} rows={work} />
        <Section t={t} icon="people" title={t.t("facts.family")} rows={family} />
        <Section t={t} icon="home" title={t.t("facts.after")} rows={after.map(([label, value]) => ({ label, value }))} />
        <Section t={t} icon="heart" title={t.t("facts.expectations")} rows={wants} />
        {gallery.length ? (
          <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 lg:p-6">
            <header className="flex items-center gap-3">
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="people" size={20} /></span>
              <h2 className="flex items-center gap-1.5 font-display text-xl font-bold">{t.t("photo.title")}{full && !b.showPhotos ? <Locked t={t} /> : null}</h2>
            </header>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((p, i) => (
                <li key={p.id}>
                  {/* the full picture in a new tab; the app checks who is asking before it sends the file */}
                  <a href={`/api/photos/${p.id}`} target="_blank" rel="noopener" className="block aspect-3/4 overflow-hidden rounded-xl border border-line bg-sunk">
                    {/* eslint-disable-next-line @next/next/no-img-element -- the app's own photo route */}
                    <img src={`/api/photos/${p.id}`} alt={t.t("photo.alt", { n: i + 1 })} loading="lazy" className="size-full object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {full?.notes ? <Section t={t} icon="note" title={t.t("facts.notes")} rows={[{ label: t.t("form.notes"), value: prose(full.notes), locked: true }]} /> : null}
        {full ? null : (
          <section className="flex flex-col gap-3 rounded-3xl border border-dashed border-line bg-surface p-5 lg:p-6 print:hidden">
            <SectionHead icon="shield" title={t.t(b.showPhotos ? "bv.whyNoName" : "bv.whyHiddenTitle")} />
            <p className="text-sm text-muted">{whoSees(b, t)}</p>
          </section>
        )}
        {more}
      </div>
    </div>
  );
}

/** "ক, খ আর গ" / "a, b and c" */
function listOf(items: string[], t: T): string {
  return items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")}${t.t("w.and")}${items[items.length - 1]}`;
}

/** Why some details are missing, naming exactly what this biodata keeps back and what its family chose to show. */
function whoSees(b: Pick<FamilyView, "showParents" | "showPhotos">, t: T): string {
  const hidden = [t.t("w.name"), ...(b.showPhotos ? [] : [t.t("w.photo")]), ...(b.showParents ? [] : [t.t("w.parents")]), t.t("w.phone"), t.t("w.income")];
  const agreed = [...(b.showParents ? [t.t("w.parentsNames")] : []), ...(b.showPhotos ? [t.t("w.photo")] : [])];
  return [
    t.t("bv.hiddenList", { list: listOf(hidden, t) }),
    agreed.length ? t.t("bv.agreed", { what: listOf(agreed, t) }) : "",
    t.t("bv.afterAgree"),
  ].filter(Boolean).join(" ");
}

interface Row { label: string; value: ReactNode | null | undefined; /** only the ghotok (and the family who wrote it) see this */ locked?: boolean }

/** The small lock beside a private field, with its meaning for screen readers and on hover. */
function Locked({ t }: { t: T }) {
  return (
    <span title={t.t("form.seenGhotok")} className="inline-flex shrink-0 text-muted">
      <Icon name="lock" size={13} /><span className="sr-only">{t.t("form.seenGhotok")}</span>
    </span>
  );
}

/** One topic: an icon, a title and a label / value table. Rows without a value are left out; an empty topic is not shown. */
function Section({ icon, title, rows, t }: { icon: IconName; title: string; rows: Row[]; t?: T }) {
  const shown = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== "");
  if (!shown.length) return null;
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 lg:p-6">
      <SectionHead icon={icon} title={title} />
      <dl className="overflow-hidden rounded-2xl border border-line">
        {shown.map((r, i) => (
          <div key={r.label} className="grid border-t border-line first:border-t-0 sm:grid-cols-[13rem_minmax(0,1fr)]">
            <dt className="flex items-center gap-1.5 bg-sunk px-4 pt-2.5 pb-1 text-sm font-semibold text-muted sm:items-start sm:py-3.5">{r.label}{r.locked && t ? <Locked t={t} /> : null}</dt>
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
      <Avatar kind={b.kind} photoUrl={b.photoUrl} className="size-14" />
      <span className="min-w-0 flex-1">
        <span className="block font-display font-bold">{no}</span>
        <span className="block truncate text-sm text-muted">{facts.join(" · ")}</span>
      </span>
      <Icon name="chevronRight" size={18} className="shrink-0 text-muted" />
    </Link>
  );
}
