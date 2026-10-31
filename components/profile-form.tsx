"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BiodataImport } from "@/components/biodata-import";
import { ActionForm, Choice, ConfirmCheck, Field, Hidden, TextArea } from "@/components/form";
import { Icon } from "@/components/icons";
import { primaryButton, quietButton } from "@/components/ui";
import type { Imported } from "@/lib/biodata-import/parse";
import type { Profile, ProfileKind } from "@/lib/db/schema";
import { useT } from "@/lib/i18n/client";
import { submitBiodataAction, updateBiodataAction } from "@/lib/actions/biodata";
import { createProfileAction, updateProfileAction } from "@/lib/actions/profiles";
import {
  AFTER_HOMES, BLOOD_GROUPS, CHOICES, COMPLEXIONS, DOWRIES, EDUCATION_MEDIUMS, EXPECT_EDUCATIONS, EXPECT_MARITALS, FAMILY_STATUSES,
  MARITAL_STATUSES, RELIGIONS,
} from "@/lib/services/profiles";

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

const STEPS = 6;

/**
 * The same form for a new person and for editing one; `profile` fills it in for editing. Six steps shown one at a
 * time, with a progress line and previous / next buttons; every step stays in the form, so one submit at the end
 * posts everything. Pick-one questions are cards of chips; for a family a chip on every field says who sees it.
 * Everything beyond name, birth year and district is optional. With `importable`, a photo, PDF or Word file of an
 * existing biodata can fill the fields first.
 */
export function ProfileForm({ kind, profile, minYear, maxYear, viewer = "admin", importable = false, ai = false }: Props) {
  const { t, options } = useT();
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

  // the wizard: which step shows, and how many of its questions have an answer
  const [step, setStep] = useState(0);
  const [done, setDone] = useState({ n: 0, total: 0 });
  const steps = useRef<(HTMLDivElement | null)[]>([]);
  const top = useRef<HTMLDivElement>(null);
  const last = step === STEPS - 1;

  const recount = useCallback(() => {
    const root = steps.current[step];
    if (!root) return;
    const byName = new Map<string, boolean>();
    for (const el of root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")) {
      if (el.type === "hidden") continue;
      const filled = el.type === "radio" || el.type === "checkbox" ? (el as HTMLInputElement).checked && el.value !== "" : el.value.trim() !== "";
      byName.set(el.name, (byName.get(el.name) ?? false) || filled);
    }
    setDone({ n: [...byName.values()].filter(Boolean).length, total: byName.size });
  }, [step]);
  useEffect(recount, [recount, version]);

  const go = (to: number) => {
    setStep(Math.max(0, Math.min(STEPS - 1, to)));
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  /** moves on only when every field on this step is valid (the browser shows the first problem) */
  const next = () => {
    const root = steps.current[step];
    for (const el of root?.querySelectorAll<HTMLInputElement>("input, select, textarea") ?? []) {
      if (!el.checkValidity()) { el.reportValidity(); return; }
    }
    go(step + 1);
  };

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
  const notSay = t("form.notSay");
  const any = t("form.any");

  const titles: [string, string | undefined][] = [
    [t("form.s1"), t("form.s1Hint")],
    [t("form.s2"), undefined],
    [t("form.s3"), t("form.s3Hint")],
    [t("form.s4"), family ? t("form.s4Hint") : undefined],
    [t("form.sAfter"), t("form.sAfterHint")],
    [t("form.s5"), family ? t("form.s5Hint") : undefined],
  ];
  const [title, hint] = titles[step];
  const pct = done.total ? Math.round((done.n / done.total) * 100) : 0;

  return (
    <div ref={top} className="flex scroll-mt-24 flex-col gap-4">
      {importable && !edit && step === 0 ? (
        <BiodataImport ai={ai} onResult={(fields) => { setImported(fields); setVersion((v) => v + 1); }} />
      ) : null}
      {fileKind && fileKind !== kind ? (
        <p className="flex items-start gap-2 rounded-2xl border border-warn-line bg-warn px-4 py-3 text-sm font-semibold text-warn-ink">
          <Icon name="shield" size={18} className="mt-0.5 shrink-0" />
          {t("form.kindMismatch", { fileKindOf: t(`kindOf.${fileKind}`), kindOf: t(`kindOf.${kind}`), fileKind: t(`kind.${fileKind}`) })}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary">{t("form.step", { n: step + 1, total: STEPS })}</p>
          <h2 className="font-display text-2xl font-bold lg:text-3xl">{title}</h2>
          {hint ? <p className="text-sm text-muted">{hint}</p> : null}
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-56 sm:shrink-0">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{t("form.progress")}</span>
            <span className="font-bold tabular-nums">{t("form.progressOf", { n: done.n, total: done.total })}</span>
          </div>
          <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("form.progress")} className="h-2 overflow-hidden rounded-full bg-sunk">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <ActionForm
        key={version}
        action={edit ? ACTIONS[viewer].update : ACTIONS[viewer].create}
        submitLabel={submit}
        pendingLabel={family ? t("form.submitting") : undefined}
        footer={(button) => (
          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">{t("form.laterNote")}</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:shrink-0">
              {step > 0 ? <button type="button" onClick={() => go(step - 1)} className={quietButton}><Icon name="back" size={18} />{t("form.prev")}</button> : null}
              {last ? <div className="sm:min-w-56">{button}</div> : (
                <button type="button" onClick={next} className={primaryButton}>{t("form.next")}<Icon name="chevronRight" size={18} /></button>
              )}
            </div>
          </div>
        )}
      >
        {(echo) => {
          const v = { ...base, ...echo };
          const at = (i: number) => (el: HTMLDivElement | null) => { steps.current[i] = el; };
          return (
            <div
              className="flex flex-col gap-4"
              onChange={recount}
              onInput={recount}
              // Enter in a text box moves to the next step instead of posting a half-seen form
              onKeyDown={(e) => { if (e.key === "Enter" && !last && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); next(); } }}
              // a required field left empty on another step: show that step, then the browser's message
              onInvalidCapture={(e) => {
                const el = e.target as HTMLInputElement;
                const i = steps.current.findIndex((s) => s?.contains(el));
                if (i >= 0 && i !== step) { e.preventDefault(); go(i); setTimeout(() => el.reportValidity(), 60); }
              }}
            >
              <Hidden name="kind" value={kind} />
              {profile ? <Hidden name="id" value={profile.id} /> : null}

              <Section ref={at(0)} active={step === 0} title={titles[0][0]}>
                <Wide>
                  <Field name="name" label={t(`form.nameOf.${kind}`)} required defaultValue={v.name} autoComplete="off" placeholder={t("form.fullName")} tag={tags("name", "ghotok")} />
                </Wide>
                <Field name="fatherName" label={t("form.father")} placeholder={t("form.fatherPlaceholder")} defaultValue={v.fatherName} tag={tags("fatherName", "ghotok")} />
                <Field name="motherName" label={t("form.mother")} placeholder={t("form.motherPlaceholder")} defaultValue={v.motherName} tag={tags("motherName", "ghotok")} />
                <Field name="birthYear" label={t("form.birthYear")} required type="number" inputMode="numeric" min={String(minYear)} max={String(maxYear)} placeholder={t("form.birthYearPlaceholder")} defaultValue={v.birthYear}
                  hint={t("form.birthYearHint", { n: kind === "patro" ? 21 : 18 })} tag={tags("birthYear", "all")} />
                <Field name="heightCm" label={t("form.height")} type="number" inputMode="numeric" min="100" max="250" placeholder={t("form.heightPlaceholder")} defaultValue={v.heightCm} hint={t("form.heightHint")} tag={tags("heightCm", "all")} />
                <Field name="weightKg" label={t("form.weight")} type="number" inputMode="numeric" min="20" max="300" placeholder={t("form.weightPlaceholder")} defaultValue={v.weightKg} tag={tags("weightKg", "all")} />
                <Choice name="complexion" label={t("form.complexion")} options={options("complexion", COMPLEXIONS)} skip={notSay} defaultValue={v.complexion} tag={tags("complexion", "all")} />
                <Choice name="bloodGroup" label={t("form.blood")} options={BLOOD_GROUPS.map((b) => [b, b] as const)} skip={t("form.unknown")} defaultValue={v.bloodGroup} tag={tags("bloodGroup", "all")} grid />
                <Choice name="religion" label={t("form.religion")} options={options("religion", RELIGIONS)} defaultValue={v.religion || "islam"} tag={tags("religion", "all")} />
                <Choice name="maritalStatus" label={t("form.marital")} options={options("marital", MARITAL_STATUSES)} defaultValue={v.maritalStatus || "obibahito"} tag={tags("maritalStatus", "all")} />
              </Section>

              <Section ref={at(1)} active={step === 1} title={titles[1][0]}>
                <Field name="education" label={t("form.education")} placeholder={t("form.educationPlaceholder")} defaultValue={v.education} tag={tags("education", "all")} />
                <Field name="profession" label={t("form.profession")} placeholder={t("form.professionPlaceholder")} defaultValue={v.profession} tag={tags("profession", "all")} />
                <Field name="workplace" label={t("form.workplace")} placeholder={t("form.workplacePlaceholder")} defaultValue={v.workplace} tag={tags("workplace", "all")} />
                <Field name="monthlyIncome" label={t("form.income")} type="number" inputMode="numeric" min="0" placeholder={t("form.incomePlaceholder")} defaultValue={v.monthlyIncome} tag={tags("monthlyIncome", "ghotok")} />
                <Wide>
                  <Choice name="educationMedium" label={t("form.medium")} options={options("medium", EDUCATION_MEDIUMS)} skip={notSay} defaultValue={v.educationMedium} tag={tags("educationMedium", "all")} />
                </Wide>
              </Section>

              <Section ref={at(2)} active={step === 2} title={titles[2][0]}>
                <Field name="village" label={t("form.village")} placeholder={t("form.villagePlaceholder")} defaultValue={v.village} tag={tags("village", "ghotok")} />
                <Field name="upazila" label={t("form.upazila")} placeholder={t("form.upazilaPlaceholder")} defaultValue={v.upazila} tag={tags("upazila", "all")} />
                <Field name="district" label={t("form.district")} placeholder={t("form.districtPlaceholder")} required defaultValue={v.district} tag={tags("district", "all")} />
                <Field name="presentAddress" label={t("form.presentAddress")} placeholder={t("form.presentAddressPlaceholder")} defaultValue={v.presentAddress} hint={t("form.presentAddressHint")} tag={tags("presentAddress", "all")} />
              </Section>

              <Section ref={at(3)} active={step === 3} title={titles[3][0]}>
                <Field name="guardianName" label={t("form.guardianName")} placeholder={t("form.guardianPlaceholder")} defaultValue={v.guardianName} tag={tags("guardianName", "ghotok")} />
                <Field name="guardianPhone" label={t("form.guardianPhone")} type="tel" inputMode="tel" placeholder={t("form.guardianPhonePlaceholder")} defaultValue={v.guardianPhone} tag={tags("guardianPhone", "ghotok")} />
                <Field name="brothers" label={t("form.brothers")} type="number" inputMode="numeric" min="0" max="30" placeholder={t("form.countPlaceholder")} defaultValue={v.brothers} tag={tags("brothers", "all")} />
                <Field name="sisters" label={t("form.sisters")} type="number" inputMode="numeric" min="0" max="30" placeholder={t("form.countPlaceholder")} defaultValue={v.sisters} tag={tags("sisters", "all")} />
                <Wide>
                  <Choice name="familyStatus" label={t("form.familyStatus")} hint={t("form.familyStatusHint")} options={options("famStatus", FAMILY_STATUSES)} skip={notSay} defaultValue={v.familyStatus} tag={tags("familyStatus", "all")} />
                </Wide>
                <Wide>
                  <Field name="religiousPractice" label={t("form.religiousPractice")} placeholder={t("form.religiousPracticePlaceholder")} defaultValue={v.religiousPractice} tag={tags("religiousPractice", "all")} />
                </Wide>
                <Wide>
                  <TextArea name="familyDetails" label={t("form.family")} placeholder={t("form.familyPlaceholder")} defaultValue={v.familyDetails} rows={v.familyDetails && v.familyDetails.length > 120 ? 6 : 3} tag={tags("familyDetails", "all")} />
                </Wide>
              </Section>

              <Section ref={at(4)} active={step === 4} title={titles[4][0]}>
                <Choice name="afterStudy" label={t(`form.afterStudy.${kind}`)} options={options("choice", CHOICES)} skip={notSay} defaultValue={v.afterStudy} tag={tags("afterStudy", "all")} />
                <Choice name="afterJob" label={t(`form.afterJob.${kind}`)} options={options("choice", CHOICES)} skip={notSay} defaultValue={v.afterJob} tag={tags("afterJob", "all")} />
                {kind === "patro" ? (
                  <>
                    <Wide>
                      <Choice name="afterHome" label={t("form.afterHome")} options={options("afterHome", AFTER_HOMES)} skip={notSay} defaultValue={v.afterHome} tag={tags("afterHome", "all")} />
                    </Wide>
                    <Wide>
                      <Choice name="dowry" label={t("form.dowry")} options={options("dowry", DOWRIES)} skip={notSay} defaultValue={v.dowry} tag={tags("dowry", "all")} />
                    </Wide>
                  </>
                ) : (
                  <Wide>
                    <Choice name="jointFamily" label={t("form.jointFamily")} options={options("choice", CHOICES)} skip={notSay} defaultValue={v.jointFamily} tag={tags("jointFamily", "all")} />
                  </Wide>
                )}
              </Section>

              <Section ref={at(5)} active={step === 5} title={titles[5][0]}>
                <Field name="expectAgeMin" label={t("form.expectAgeMin")} type="number" inputMode="numeric" min="18" max="80" placeholder={t("form.expectAgeMinPlaceholder")} defaultValue={v.expectAgeMin} tag={tags("expectAgeMin", "all")} />
                <Field name="expectAgeMax" label={t("form.expectAgeMax")} type="number" inputMode="numeric" min="18" max="80" placeholder={t("form.expectAgeMaxPlaceholder")} defaultValue={v.expectAgeMax} tag={tags("expectAgeMax", "all")} />
                <Choice name="expectEducation" label={t("form.expectEducation")} options={options("expectEdu", EXPECT_EDUCATIONS)} skip={any} defaultValue={v.expectEducation} tag={tags("expectEducation", "all")} />
                <Choice name="expectMarital" label={t("form.marital")} options={options("expectMarital", EXPECT_MARITALS)} skip={any} defaultValue={v.expectMarital} tag={tags("expectMarital", "all")} />
                <Wide>
                  <Field name="expectDistricts" label={t("form.expectDistricts")} placeholder={t("form.expectDistrictsPlaceholder")} defaultValue={v.expectDistricts} hint={t("form.expectDistrictsHint")} tag={tags("expectDistricts", "all")} />
                </Wide>
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
                {family ? (
                  <Wide>
                    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-sunk/40 p-4">
                      <ConfirmCheck name="pledge" label={t("form.pledge")} defaultChecked={!!profile?.pledgedAt} />
                      <p className="flex items-start gap-2 text-sm text-muted">
                        <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-primary" />
                        {t("form.note")}
                      </p>
                    </div>
                  </Wide>
                ) : null}
              </Section>
            </div>
          );
        }}
      </ActionForm>
    </div>
  );
}

/** One step of the form: a card whose fields sit two to a row from `sm` up. Steps not in view stay in the form, hidden. */
function Section({ ref, active, title, children }: { ref: (el: HTMLDivElement | null) => void; active: boolean; title: string; children: ReactNode }) {
  return (
    <div ref={ref} hidden={!active}>
      <fieldset className="rounded-3xl border border-line bg-surface p-4 lg:p-6">
        <legend className="sr-only">{title}</legend>
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      </fieldset>
    </div>
  );
}

/** A field that takes the whole row. */
function Wide({ children }: { children: ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}
