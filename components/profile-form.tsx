"use client";

import { useState, type ReactNode } from "react";
import { BiodataImport } from "@/components/biodata-import";
import { ActionForm, Field, Hidden, Select, TextArea } from "@/components/form";
import { Icon } from "@/components/icons";
import type { Imported } from "@/lib/biodata-import/parse";
import type { Profile, ProfileKind } from "@/lib/db/schema";
import { useT } from "@/lib/i18n/client";
import { submitBiodataAction, updateBiodataAction } from "@/lib/actions/biodata";
import { createProfileAction, updateProfileAction } from "@/lib/actions/profiles";
import { MARITAL_STATUSES, RELIGIONS } from "@/lib/services/profiles";

/** Who is filling the form: the ghotok (full form, their private notes) or a family (their own biodata, no notes). */
export type Viewer = "admin" | "customer";

const ACTIONS = {
  admin: { create: createProfileAction, update: updateProfileAction },
  customer: { create: submitBiodataAction, update: updateBiodataAction },
};

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
  const { t, n, options } = useT();
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
    ? (edit ? t("form.submitFamilyEdit") : t("form.submitFamilyNew"))
    : (edit ? t("common.save") : t("form.addKind", { kind: t(`kind.${kind}`) }));

  const seen = (by: "all" | "ghotok") => by === "all"
    ? <span key="seen" className="inline-flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-mint-ink"><Icon name="eye" size={12} />{t("form.seenAll")}</span>
    : <span key="seen" className="inline-flex items-center gap-1 rounded-full bg-sunk px-2 py-0.5 text-[11px] font-bold text-muted"><Icon name="lock" size={12} />{t("form.seenGhotok")}</span>;
  const fromFile = <span key="file" className="inline-flex items-center gap-1 rounded-full bg-mango px-2 py-0.5 text-[11px] font-bold text-mango-ink"><Icon name="note" size={12} />{t("form.fromFile")}</span>;
  const tags = (field: string, by?: "all" | "ghotok") => {
    const chips: ReactNode[] = [];
    if (family && by) chips.push(seen(by));
    if (field in importedFields) chips.push(fromFile);
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
          {t("form.kindMismatch", { fileKindOf: t(`kindOf.${fileKind}`), kindOf: t(`kindOf.${kind}`), fileKind: t(`kind.${fileKind}`) })}
        </p>
      ) : null}
      <ActionForm key={version} action={edit ? ACTIONS[viewer].update : ACTIONS[viewer].create} submitLabel={submit} pendingLabel={family ? t("form.submitting") : undefined}>
        {(echo) => {
          const v = { ...base, ...echo };
          return (
            <>
              <Hidden name="kind" value={kind} />
              {profile ? <Hidden name="id" value={profile.id} /> : null}

              <Section n={n(1)} title={t("form.s1")} hint={t("form.s1Hint")}>
                <Wide>
                  <Field name="name" label={t(`form.nameOf.${kind}`)} required defaultValue={v.name} autoComplete="off" placeholder={t("form.fullName")} tag={tags("name", "ghotok")} />
                </Wide>
                <Field name="fatherName" label={t("form.father")} defaultValue={v.fatherName} tag={tags("fatherName", "ghotok")} />
                <Field name="motherName" label={t("form.mother")} defaultValue={v.motherName} tag={tags("motherName", "ghotok")} />
                <Field name="birthYear" label={t("form.birthYear")} required type="number" inputMode="numeric" min={String(minYear)} max={String(maxYear)} placeholder={t("form.birthYearPlaceholder")} defaultValue={v.birthYear}
                  hint={t("form.birthYearHint", { n: kind === "patro" ? 21 : 18 })} tag={tags("birthYear", "all")} />
                <Field name="heightCm" label={t("form.height")} type="number" inputMode="numeric" min="100" max="250" placeholder={t("form.heightPlaceholder")} defaultValue={v.heightCm} hint={t("form.heightHint")} tag={tags("heightCm", "all")} />
                <Select name="religion" label={t("form.religion")} options={options("religion", RELIGIONS)} defaultValue={v.religion || "islam"} tag={tags("religion", "all")} />
                <Select name="maritalStatus" label={t("form.marital")} options={options("marital", MARITAL_STATUSES)} defaultValue={v.maritalStatus || "obibahito"} tag={tags("maritalStatus", "all")} />
              </Section>

              <Section n={n(2)} title={t("form.s2")}>
                <Field name="education" label={t("form.education")} placeholder={t("form.educationPlaceholder")} defaultValue={v.education} tag={tags("education", "all")} />
                <Field name="profession" label={t("form.profession")} placeholder={t("form.professionPlaceholder")} defaultValue={v.profession} tag={tags("profession", "all")} />
                <Field name="monthlyIncome" label={t("form.income")} type="number" inputMode="numeric" min="0" placeholder={t("form.incomePlaceholder")} defaultValue={v.monthlyIncome} tag={tags("monthlyIncome", "ghotok")} />
              </Section>

              <Section n={n(3)} title={t("form.s3")} hint={t("form.s3Hint")}>
                <Field name="village" label={t("form.village")} defaultValue={v.village} tag={tags("village", "ghotok")} />
                <Field name="upazila" label={t("form.upazila")} defaultValue={v.upazila} tag={tags("upazila", "all")} />
                <Field name="district" label={t("form.district")} required defaultValue={v.district} tag={tags("district", "all")} />
              </Section>

              <Section n={n(4)} title={t("form.s4")} hint={family ? t("form.s4Hint") : undefined}>
                <Field name="guardianName" label={t("form.guardianName")} placeholder={t("form.guardianPlaceholder")} defaultValue={v.guardianName} tag={tags("guardianName", "ghotok")} />
                <Field name="guardianPhone" label={t("form.guardianPhone")} type="tel" inputMode="tel" placeholder="01XXXXXXXXX" defaultValue={v.guardianPhone} tag={tags("guardianPhone", "ghotok")} />
                <Wide>
                  <TextArea name="familyDetails" label={t("form.family")} placeholder={t("form.familyPlaceholder")} defaultValue={v.familyDetails} rows={v.familyDetails && v.familyDetails.length > 120 ? 6 : 3} tag={tags("familyDetails", "all")} />
                </Wide>
              </Section>

              <Section n={n(5)} title={t("form.s5")} hint={family ? t("form.s5Hint") : undefined}>
                <Wide>
                  <TextArea name="expectations" label={t("form.expectations")} placeholder={t("form.expectationsPlaceholder")} defaultValue={v.expectations} tag={tags("expectations", "all")} />
                </Wide>
                <Wide>
                  <Field name="photoUrl" label={t("form.photo")} type="url" inputMode="url" placeholder="https://…" defaultValue={v.photoUrl} hint={t("form.photoHint")} tag={tags("photoUrl", "ghotok")} />
                </Wide>
                {family ? null : (
                  <Wide>
                    <TextArea name="notes" label={t("form.notes")} placeholder={t("form.notesPlaceholder")} defaultValue={v.notes} />
                  </Wide>
                )}
              </Section>

              {family ? (
                <p className="flex items-start gap-2 text-sm text-muted">
                  <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-primary" />
                  {t("form.note")}
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
function Section({ n, title, hint, children }: { n: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-4 lg:p-6">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-base font-bold text-primary">{n}</span>
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
