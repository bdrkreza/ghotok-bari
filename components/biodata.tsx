import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import { Icon, type IconName } from "./icons";
import { ProfileBadge } from "./ui";
import { MARITAL, RELIGION, biodataNo, bn, heightLabel } from "@/lib/bn";
import type { MaritalStatus, ProfileKind, ProfileStatus, Religion } from "@/lib/db/schema";
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

/**
 * A biodata as a family sees it: a card with the number and the facts asked first, then family and expectations,
 * then whatever the page puts beside it (how to reach the ghotok). Used by the public link and the signed-in view.
 */
export function FamilyBiodata({ b, aside }: { b: FamilyView; aside?: ReactNode }) {
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
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[18rem_1fr] lg:items-start lg:gap-6">
      <section className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface p-6 text-center">
        <Avatar kind={b.kind} className="size-24" />
        <div>
          <p className="text-sm text-muted">বায়োডাটা নম্বর</p>
          <h1 className="font-display text-2xl font-bold">{biodataNo(b.kind, b.code)}</h1>
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
        {aside}
      </div>
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
