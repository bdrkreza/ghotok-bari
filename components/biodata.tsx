import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import { Icon, type IconName } from "./icons";
import { ContactButtons } from "./site";
import { Card, ProfileBadge } from "./ui";
import type { MaritalStatus, ProfileKind, ProfileStatus, Religion } from "@/lib/db/schema";
import type { T } from "@/lib/i18n";
import type { PublicSite } from "@/lib/services/site";
import { ageFromYear } from "@/lib/time";

/** The fields a family may see of someone else's biodata (FAMILY_VIEW in lib/services/share.ts). */
export interface FamilyView {
  code: number;
  kind: ProfileKind;
  birthYear: number;
  heightCm: number | null;
  religion: Religion;
  maritalStatus: MaritalStatus;
  education: string | null;
  profession: string | null;
  upazila: string | null;
  district: string;
  familyDetails: string | null;
  expectations: string | null;
  status: ProfileStatus;
}

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
 * A biodata as a family sees it: a card with the number and the facts asked first, then family and expectations,
 * then whatever the page puts beside it (how to reach the ghotok). Used by the public link and the signed-in view.
 */
export function FamilyBiodata({ b, t, aside }: { b: FamilyView; t: T; aside?: ReactNode }) {
  const facts: [IconName, string, string][] = [
    ["calendar", t.t("facts.age"), t.years(ageFromYear(b.birthYear))],
    ["rings", t.t("facts.marital"), t.t(`marital.${b.maritalStatus}`)],
    ["ruler", t.t("facts.height"), b.heightCm ? t.height(b.heightCm) : ""],
    ["people", t.t("facts.religion"), t.t(`religion.${b.religion}`)],
    ["location", t.t("facts.address"), [b.upazila, b.district].filter(Boolean).join(", ")],
    ["school", t.t("facts.education"), b.education ?? ""],
    ["briefcase", t.t("facts.profession"), b.profession ?? ""],
  ];
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[18rem_1fr] lg:items-start lg:gap-6">
      <section className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface p-6 text-center">
        <Avatar kind={b.kind} className="size-24" />
        <div>
          <p className="text-sm text-muted">{t.t("bv.number")}</p>
          <h1 className="font-display text-2xl font-bold">{t.biodataNo(b.kind, b.code)}</h1>
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
        {b.familyDetails ? <Block icon="people" title={t.t("facts.family")} text={b.familyDetails} /> : null}
        {b.expectations ? <Block icon="heart" title={t.t("facts.expectations")} text={b.expectations} /> : null}
        {aside}
      </div>
    </div>
  );
}

/** A small card of someone else's biodata for a family: number, the first facts, and a link to the full view. */
export function FamilyBiodataCard({ b, t }: { b: FamilyView & { id: string }; t: T }) {
  const no = t.biodataNo(b.kind, b.code);
  const facts = [t.years(ageFromYear(b.birthYear)), [b.upazila, b.district].filter(Boolean).join(", "), b.profession ?? b.education ?? ""].filter(Boolean);
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

function Block({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <section className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 font-display text-base font-bold"><Icon name={icon} size={18} className="text-primary" />{title}</h2>
      <p className="whitespace-pre-line">{text}</p>
    </section>
  );
}
