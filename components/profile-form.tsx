"use client";

import type { ReactNode } from "react";
import { ActionForm, Field, Hidden, Select, TextArea } from "@/components/form";
import { KIND_LABEL, MARITAL, RELIGION, options } from "@/lib/bn";
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

/** The same long form for a new person and for editing one; `profile` fills it in for editing. */
export function ProfileForm({ kind, profile, minYear, maxYear, viewer = "admin" }: { kind: ProfileKind; profile?: Profile; minYear: number; maxYear: number; viewer?: Viewer }) {
  const edit = !!profile;
  const base: Record<string, string> = profile
    ? Object.fromEntries(Object.entries(profile).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)]))
    : {};
  const submit = viewer === "admin"
    ? (edit ? "সংরক্ষণ করুন" : `${KIND_LABEL[kind]} যোগ করুন`)
    : (edit ? "সংরক্ষণ করে আবার জমা দিন" : "বায়োডাটা জমা দিন");
  return (
    <ActionForm action={edit ? ACTIONS[viewer].update : ACTIONS[viewer].create} submitLabel={submit}>
      {(echo) => {
        const v = { ...base, ...echo };
        return (
          <>
            <Hidden name="kind" value={kind} />
            {profile ? <Hidden name="id" value={profile.id} /> : null}

            <Section title="পরিচয়">
              <Field name="name" label={`${KIND_OF[kind]} নাম`} required defaultValue={v.name} autoComplete="off"
                hint={viewer === "customer" ? "নাম শুধু ঘটক দেখবেন; তালিকায় শুধু বায়োডাটা নম্বর যায়।" : undefined} />
              <Field name="fatherName" label="বাবার নাম" defaultValue={v.fatherName} />
              <Field name="motherName" label="মায়ের নাম" defaultValue={v.motherName} />
              <div className="grid grid-cols-2 gap-3">
                <Field name="birthYear" label="জন্ম সাল" required type="number" inputMode="numeric" min={String(minYear)} max={String(maxYear)} placeholder="যেমন 1998" defaultValue={v.birthYear}
                  hint={kind === "patro" ? "বয়স কমপক্ষে ২১" : "বয়স কমপক্ষে ১৮"} />
                <Field name="heightCm" label="উচ্চতা (সেমি)" type="number" inputMode="numeric" min="100" max="250" placeholder="যেমন 165" defaultValue={v.heightCm} hint="৫ ফুট ≈ ১৫২ সেমি" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select name="religion" label="ধর্ম" options={options(RELIGION)} defaultValue={v.religion || "islam"} />
                <Select name="maritalStatus" label="বৈবাহিক অবস্থা" options={options(MARITAL)} defaultValue={v.maritalStatus || "obibahito"} />
              </div>
            </Section>

            <Section title="শিক্ষা ও পেশা">
              <Field name="education" label="শিক্ষাগত যোগ্যতা" placeholder="যেমন এইচএসসি, অনার্স" defaultValue={v.education} />
              <Field name="profession" label="পেশা" placeholder="যেমন কৃষি, চাকরি, ব্যবসা" defaultValue={v.profession} />
              <Field name="monthlyIncome" label="মাসিক আয় (টাকা)" type="number" inputMode="numeric" min="0" defaultValue={v.monthlyIncome}
                hint={viewer === "customer" ? "অন্য পরিবার দেখবে না, শুধু ঘটক।" : undefined} />
            </Section>

            <Section title="ঠিকানা">
              <Field name="village" label="গ্রাম" defaultValue={v.village} />
              <div className="grid grid-cols-2 gap-3">
                <Field name="upazila" label="উপজেলা" defaultValue={v.upazila} />
                <Field name="district" label="জেলা" required defaultValue={v.district} />
              </div>
            </Section>

            <Section title="অভিভাবক">
              <Field name="guardianName" label="অভিভাবকের নাম" defaultValue={v.guardianName} />
              <Field name="guardianPhone" label="অভিভাবকের মোবাইল" type="tel" inputMode="tel" placeholder="01XXXXXXXXX" defaultValue={v.guardianPhone}
                hint={viewer === "customer" ? "ঘটক এই নম্বরে কথা বলবেন; অন্য কেউ দেখবে না।" : undefined} />
              <TextArea name="familyDetails" label="পরিবারের বিবরণ" placeholder="ভাইবোন, জমিজমা, পারিবারিক অবস্থা…" defaultValue={v.familyDetails} />
            </Section>

            <Section title="অন্যান্য">
              <TextArea name="expectations" label="কেমন পাত্র/পাত্রী চান" placeholder="পরিবারের চাওয়া: শিক্ষা, এলাকা, পেশা…" defaultValue={v.expectations} />
              <Field name="photoUrl" label="ছবির লিংক" type="url" inputMode="url" placeholder="https://…" defaultValue={v.photoUrl}
                hint={viewer === "customer" ? "ছবি শুধু ঘটক দেখবেন। আপাতত লিংক বসান; সরাসরি আপলোড পরে আসবে।" : "আপাতত ছবির লিংক বসান; সরাসরি আপলোড পরে আসবে।"} />
              {viewer === "admin" ? <TextArea name="notes" label="ঘটকের নোট" placeholder="শুধু আপনি দেখবেন" defaultValue={v.notes} /> : null}
            </Section>
          </>
        );
      }}
    </ActionForm>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <legend className="px-1 text-sm font-bold text-primary">{title}</legend>
      {children}
    </fieldset>
  );
}
