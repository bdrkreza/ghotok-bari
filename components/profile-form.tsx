"use client";

import { useState, type ReactNode } from "react";
import { BiodataImport } from "@/components/biodata-import";
import { ActionForm, Field, Hidden, Select, TextArea } from "@/components/form";
import { Icon } from "@/components/icons";
import type { Imported } from "@/lib/biodata-import/parse";
import { KIND_LABEL, MARITAL, RELIGION, bn, options } from "@/lib/bn";
import type { Profile, ProfileKind } from "@/lib/db/schema";
import { submitBiodataAction, updateBiodataAction } from "@/lib/actions/biodata";
import { createProfileAction, updateProfileAction } from "@/lib/actions/profiles";

const KIND_OF: Record<ProfileKind, string> = { patro: "পাত্রের", patri: "পাত্রীর" };

/** Who is filling the form: the ghotok (full form, their private notes) or a family (their own biodata, no notes). */
export type Viewer = "admin" | "customer";

const ACTIONS = {
  admin: { create: createProfileAction, update: updateProfileAction },
  customer: { create: submitBiodataAction, update: updateBiodataAction },
};

/** Beside a field's label on the family's form: whether other families get to see it. */
function Seen({ by }: { by: "all" | "ghotok" }) {
  return by === "all" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-mint-ink"><Icon name="eye" size={12} />তালিকায় দেখা যায়</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-sunk px-2 py-0.5 text-[11px] font-bold text-muted"><Icon name="lock" size={12} />শুধু ঘটক</span>
  );
}

/** Beside a field that was filled from an uploaded file: look at it. */
function FromFile() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-mango px-2 py-0.5 text-[11px] font-bold text-mango-ink"><Icon name="note" size={12} />ফাইল থেকে</span>;
}

interface Props {
  kind: ProfileKind;
  profile?: Profile;
  minYear: number;
  maxYear: number;
  viewer?: Viewer;
  /** offer "ফাইল থেকে ভরুন" above a new person's form */
  importable?: boolean;
  /** the import reads with AI on the server (an API key is set) instead of in the browser */
  ai?: boolean;
}

/**
 * The same long form for a new person and for editing one; `profile` fills it in for editing. Five numbered
 * sections, fields side by side where the screen allows, and for a family a chip on every field saying who sees it.
 * With `importable`, a photo, PDF or Word file of an existing biodata can fill the fields first.
 */
export function ProfileForm({ kind, profile, minYear, maxYear, viewer = "admin", importable = false, ai = false }: Props) {
  const edit = !!profile;
  const family = viewer === "customer";
  // what an uploaded file filled in; bumping `version` remounts the form so the new defaults show
  const [imported, setImported] = useState<Imported>({});
  const [version, setVersion] = useState(0);
  const fromProfile: Record<string, string> = profile
    ? Object.fromEntries(Object.entries(profile).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)]))
    : {};
  const { kind: importedKind, ...importedFields } = imported;
  const fileKind: ProfileKind | undefined = importedKind === "patro" || importedKind === "patri" ? importedKind : undefined;
  const base: Record<string, string> = { ...fromProfile, ...importedFields };
  const submit = family
    ? (edit ? "সংরক্ষণ করে আবার জমা দিন" : "বায়োডাটা জমা দিন")
    : (edit ? "সংরক্ষণ করুন" : `${KIND_LABEL[kind]} যোগ করুন`);
  const tags = (field: string, by?: "all" | "ghotok") => {
    const chips: ReactNode[] = [];
    if (family && by) chips.push(<Seen key="seen" by={by} />);
    if (field in importedFields) chips.push(<FromFile key="file" />);
    return chips.length ? <span className="inline-flex flex-wrap gap-1">{chips}</span> : undefined;
  };

  return (
    <div className="flex flex-col gap-4">
      {importable && !edit ? (
        <BiodataImport ai={ai} onResult={(fields) => { setImported(fields); setVersion((v) => v + 1); }} />
      ) : null}
      {fileKind && fileKind !== kind ? (
        <p className="flex items-start gap-2 rounded-2xl border border-warn-line bg-warn px-4 py-3 text-sm font-semibold text-warn-ink">
          <Icon name="shield" size={18} className="mt-0.5 shrink-0" />
          ফাইলটি {KIND_OF[fileKind]} বায়োডাটা মনে হচ্ছে, কিন্তু এই ফর্ম {KIND_OF[kind]}। ওপরে {KIND_LABEL[fileKind]} বেছে নিন, তারপর ফাইলটি আবার দিন।
        </p>
      ) : null}
      <ActionForm key={version} action={edit ? ACTIONS[viewer].update : ACTIONS[viewer].create} submitLabel={submit} pendingLabel={family ? "জমা হচ্ছে…" : undefined}>
        {(echo) => {
          const v = { ...base, ...echo };
          return (
            <>
              <Hidden name="kind" value={kind} />
              {profile ? <Hidden name="id" value={profile.id} /> : null}

              <Section n={1} title="পরিচয়" hint="নাম আর জন্ম সাল লাগবেই; বাকিটা জানা থাকলে লিখুন।">
                <Wide>
                  <Field name="name" label={`${KIND_OF[kind]} নাম`} required defaultValue={v.name} autoComplete="off" placeholder="পূর্ণ নাম" tag={tags("name", "ghotok")} />
                </Wide>
                <Field name="fatherName" label="বাবার নাম" defaultValue={v.fatherName} tag={tags("fatherName", "ghotok")} />
                <Field name="motherName" label="মায়ের নাম" defaultValue={v.motherName} tag={tags("motherName", "ghotok")} />
                <Field name="birthYear" label="জন্ম সাল" required type="number" inputMode="numeric" min={String(minYear)} max={String(maxYear)} placeholder="যেমন 1998" defaultValue={v.birthYear}
                  hint={`বয়স এখান থেকেই হিসাব হয়; ${kind === "patro" ? "কমপক্ষে ২১" : "কমপক্ষে ১৮"} বছর`} tag={tags("birthYear", "all")} />
                <Field name="heightCm" label="উচ্চতা (সেমি)" type="number" inputMode="numeric" min="100" max="250" placeholder="যেমন 165" defaultValue={v.heightCm} hint="৫ ফুট ≈ ১৫২ সেমি, ৫ ফুট ৬ ≈ ১৬৮" tag={tags("heightCm", "all")} />
                <Select name="religion" label="ধর্ম" options={options(RELIGION)} defaultValue={v.religion || "islam"} tag={tags("religion", "all")} />
                <Select name="maritalStatus" label="বৈবাহিক অবস্থা" options={options(MARITAL)} defaultValue={v.maritalStatus || "obibahito"} tag={tags("maritalStatus", "all")} />
              </Section>

              <Section n={2} title="শিক্ষা ও পেশা">
                <Field name="education" label="শিক্ষাগত যোগ্যতা" placeholder="যেমন এইচএসসি, অনার্স" defaultValue={v.education} tag={tags("education", "all")} />
                <Field name="profession" label="পেশা" placeholder="যেমন কৃষি, চাকরি, ব্যবসা" defaultValue={v.profession} tag={tags("profession", "all")} />
                <Field name="monthlyIncome" label="মাসিক আয় (টাকা)" type="number" inputMode="numeric" min="0" placeholder="যেমন 25000" defaultValue={v.monthlyIncome} tag={tags("monthlyIncome", "ghotok")} />
              </Section>

              <Section n={3} title="ঠিকানা" hint="জেলা লাগবেই; উপজেলা দিলে কাছাকাছি মিল খুঁজতে সুবিধা।">
                <Field name="village" label="গ্রাম" defaultValue={v.village} tag={tags("village", "ghotok")} />
                <Field name="upazila" label="উপজেলা" defaultValue={v.upazila} tag={tags("upazila", "all")} />
                <Field name="district" label="জেলা" required defaultValue={v.district} tag={tags("district", "all")} />
              </Section>

              <Section n={4} title="অভিভাবক ও পরিবার" hint={family ? "ঘটক এই নম্বরে কথা বলবেন; অন্য কেউ দেখবে না।" : undefined}>
                <Field name="guardianName" label="অভিভাবকের নাম" placeholder="যেমন মো. রহিম (বাবা)" defaultValue={v.guardianName} tag={tags("guardianName", "ghotok")} />
                <Field name="guardianPhone" label="অভিভাবকের মোবাইল" type="tel" inputMode="tel" placeholder="01XXXXXXXXX" defaultValue={v.guardianPhone} tag={tags("guardianPhone", "ghotok")} />
                <Wide>
                  <TextArea name="familyDetails" label="পরিবারের বিবরণ" placeholder="ভাইবোন, জমিজমা, পারিবারিক অবস্থা…" defaultValue={v.familyDetails} rows={v.familyDetails && v.familyDetails.length > 120 ? 6 : 3} tag={tags("familyDetails", "all")} />
                </Wide>
              </Section>

              <Section n={5} title="প্রত্যাশা ও ছবি" hint={family ? "প্রত্যাশা স্পষ্ট লিখলে ঘটক ভালো মিল খুঁজতে পারেন।" : undefined}>
                <Wide>
                  <TextArea name="expectations" label="কেমন পাত্র/পাত্রী চান" placeholder="পরিবারের চাওয়া: শিক্ষা, এলাকা, পেশা…" defaultValue={v.expectations} tag={tags("expectations", "all")} />
                </Wide>
                <Wide>
                  <Field name="photoUrl" label="ছবির লিংক" type="url" inputMode="url" placeholder="https://…" defaultValue={v.photoUrl}
                    hint="আপাতত ছবির লিংক বসান; সরাসরি আপলোড পরে আসবে।" tag={tags("photoUrl", "ghotok")} />
                </Wide>
                {family ? null : (
                  <Wide>
                    <TextArea name="notes" label="ঘটকের নোট" placeholder="শুধু আপনি দেখবেন" defaultValue={v.notes} />
                  </Wide>
                )}
              </Section>

              {family ? (
                <p className="flex items-start gap-2 text-sm text-muted">
                  <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-primary" />
                  জমা দিলে ঘটক দেখে তালিকায় তুলবেন; তার আগে অন্য কেউ দেখবে না। পরে যেকোনো সময় বদলানো যাবে।
                </p>
              ) : null}
            </>
          );
        }}
      </ActionForm>
    </div>
  );
}

/** A numbered part of the form; its fields sit two to a row from `sm` up. */
function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-4 lg:p-6">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-base font-bold text-primary">{bn(n)}</span>
        <div className="min-w-0">
          <p className="font-display text-base font-bold">{title}</p>
          {hint ? <p className="text-sm text-muted">{hint}</p> : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** A field that takes the whole row. */
function Wide({ children }: { children: ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}
