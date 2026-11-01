"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { BiodataImport } from "@/components/biodata-import";
import { ActionForm, Choice, ConfirmCheck, Field, FieldErrors, Hidden, TextArea } from "@/components/form";
import { Icon } from "@/components/icons";
import { primaryButton, quietButton } from "@/components/ui";
import type { Imported } from "@/lib/biodata-import/parse";
import type { Profile, ProfileKind } from "@/lib/db/schema";
import type { Key } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { submitBiodataAction, updateBiodataAction } from "@/lib/actions/biodata";
import { normalizePhone } from "@/lib/auth/phone";
import { createProfileAction, updateProfileAction } from "@/lib/actions/profiles";
import {
  AFTER_HOMES, BLOOD_GROUPS, CHOICES, COMPLEXIONS, DOWRIES, EDUCATION_MEDIUMS, EXPECT_EDUCATIONS, EXPECT_MARITALS, FAMILY_STATUSES,
  MARITAL_STATUSES, MIN_AGE, RELIGIONS,
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
/** the short names on the step line */
const STEP_NAMES: Key[] = ["form.stepName1", "form.stepName2", "form.stepName3", "form.stepName4", "form.stepName5", "form.stepName6"];

/** A box the form checks itself: text, number, phone and link boxes, text areas and the pledge tick. */
type Box = HTMLInputElement | HTMLTextAreaElement;
const isBox = (el: EventTarget): el is Box =>
  (el instanceof HTMLInputElement && el.type !== "hidden" && el.type !== "radio") || el instanceof HTMLTextAreaElement;
/** The fields marked as refused: what to say under each, and the step it sits on. */
type Marked = Record<string, { message: string; step: number }>;

/**
 * The same form for a new person and for editing one; `profile` fills it in for editing. Six steps shown one at a
 * time, with a progress line and previous / next buttons; every step stays in the form, so one submit at the end
 * posts everything. Pick-one questions are cards of chips; for a family a chip on every field says who sees it.
 * Everything beyond name, birth year and district is optional. With `importable`, a photo, PDF or Word file of an
 * existing biodata can fill the fields first.
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

  // the wizard: which step shows, which have been seen, how many of this step's questions have an answer, which
  // fields are marked as refused, and whether the last attempt to move on (or hand in) was stopped by one
  const [step, setStep] = useState(0);
  const [seenSteps, setSeenSteps] = useState<number[]>([0]);
  const [done, setDone] = useState({ n: 0, total: 0 });
  const [marked, setMarked] = useState<Marked>({});
  const [tried, setTried] = useState(false);
  const messages = useMemo(() => Object.fromEntries(Object.entries(marked).map(([k, m]) => [k, m.message])), [marked]);
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

  /** show step `to`; `land` scrolls to the top of the form and, with a mouse, puts the cursor in its first box */
  const go = (to: number, land = true) => {
    const i = Math.max(0, Math.min(STEPS - 1, to));
    setStep(i);
    setSeenSteps((s) => (s.includes(i) ? s : [...s, i]));
    setTried(false);
    if (!land) return;
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // with a keyboard and mouse, land in the step's first box; on a phone that would pop the keyboard up
    if (window.matchMedia("(pointer: fine)").matches) {
      setTimeout(() => steps.current[i]?.querySelector<HTMLElement>("input:not([type=hidden]):not([type=radio]), textarea")?.focus({ preventScroll: true }), 350);
    }
  };

  /**
   * Why this box's answer would be refused, in plain words of the user's language, or null when it is fine. The same
   * rules as the server (parseProfile), so a refusal is seen on the step it belongs to, not after handing in.
   */
  const problem = (el: Box): string | null => {
    if (el instanceof HTMLInputElement && el.type === "checkbox") return el.required && !el.checked ? t("fe.pledge") : null;
    const value = el.value.trim();
    const v = el.validity;
    if (v.badInput) return t("fe.number"); // letters in a number box: the browser reports the box as empty
    if (!value) return el.required ? t("fe.required") : null;
    if (el.minLength > 0 && value.length < el.minLength) return t("fe.short", { n: el.minLength });
    if (el.maxLength > 0 && value.length > el.maxLength) return t("fe.long", { n: el.maxLength });
    if (el instanceof HTMLInputElement && el.type === "number") {
      if (!Number.isInteger(Number(value))) return t("fe.number");
      if (el.name === "birthYear" && v.rangeOverflow) return t(`fe.young_${kind}`, { age: MIN_AGE[kind], year: maxYear });
      if (v.rangeUnderflow || v.rangeOverflow) {
        return el.max ? t("fe.range", { min: Number(el.min), max: Number(el.max) }) : t("fe.min", { min: Number(el.min) });
      }
      if (el.name === "expectAgeMax") {
        const low = Number((el.form?.elements.namedItem("expectAgeMin") as HTMLInputElement | null)?.value || NaN);
        if (low > Number(value)) return t("fe.age_order");
      }
    }
    if (v.typeMismatch) return t("fe.url");
    if (el.name === "guardianPhone" && !normalizePhone(value)) return t("fe.phone");
    return null;
  };
  const boxes = (i: number) => [...(steps.current[i]?.querySelectorAll<Box>("input, textarea") ?? [])].filter(isBox);
  /** the problems on steps `from` to `to`, in the order the fields appear */
  const examine = (from: number, to: number) => {
    const found: Marked = {};
    for (let i = from; i <= to; i++) {
      for (const el of boxes(i)) {
        const message = problem(el);
        if (message && !found[el.name]) found[el.name] = { message, step: i };
      }
    }
    return found;
  };
  /**
   * Mark `found` (it replaces whatever was marked on the steps in `checked`), then take the user to the first one:
   * its step, scrolled into view, the cursor in it.
   */
  const report = (found: Marked, checked: number[]) => {
    setMarked((old) => ({ ...Object.fromEntries(Object.entries(old).filter(([, m]) => !checked.includes(m.step))), ...found }));
    const first = Object.entries(found).sort((a, b) => a[1].step - b[1].step)[0];
    if (!first) return true;
    const [name, { step: at }] = first;
    if (at !== step) go(at, false);
    setTried(true);
    setTimeout(() => {
      const el = steps.current[at]?.querySelector<HTMLElement>(`[name="${name}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
    }, at !== step ? 80 : 0);
    return false;
  };
  /** true when nothing on this step is refused; otherwise marks every problem on it and goes to the first */
  const stepOk = () => report(examine(step, step), [step]);
  const next = () => { if (stepOk()) go(step + 1); };
  /** the step line: back to any step already seen at once; forward only past a step with nothing refused */
  const jump = (to: number) => {
    if (to === step) return;
    if (to < step || seenSteps.includes(to) || stepOk()) go(to);
  };
  /** while typing in a marked box, its message follows the answer and goes away once the answer is fine */
  const recheck = (e: FormEvent) => {
    recount();
    const el = e.target;
    if (!isBox(el)) return;
    const others = el.name === "expectAgeMin" ? [el.form?.elements.namedItem("expectAgeMax")].filter((x): x is HTMLInputElement => x instanceof HTMLInputElement) : [];
    setMarked((old) => {
      const affected = [el, ...others].filter((x) => old[x.name]);
      if (!affected.length) return old;
      const now = { ...old };
      for (const x of affected) {
        const message = problem(x);
        if (message) now[x.name] = { ...old[x.name], message };
        else delete now[x.name];
      }
      return now;
    });
  };
  /** leaving a box with an answer in it checks that answer at once (an empty box is only flagged on moving on) */
  const checkOnLeave = (e: FormEvent) => {
    const el = e.target;
    if (!isBox(el) || el.type === "checkbox" || !el.value.trim()) return;
    const message = problem(el);
    const at = steps.current.findIndex((s) => s?.contains(el));
    if (message && at >= 0) setMarked((old) => ({ ...old, [el.name]: { message, step: at } }));
  };
  /** fields the server refused (rules the browser cannot check, or a form posted without JavaScript checks) */
  const markFromServer = (fieldErrors?: Record<string, string>) => {
    if (!fieldErrors) return;
    const found: Marked = {};
    for (const [name, message] of Object.entries(fieldErrors)) {
      const at = steps.current.findIndex((s) => s?.querySelector(`[name="${name}"]`));
      if (at >= 0) found[name] = { message, step: at };
    }
    report(found, []);
  };
  const toFix = Object.values(marked).filter((m) => m.step === step).length;

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
        <BiodataImport ai={ai} onResult={(fields) => { setImported(fields); setMarked({}); setVersion((v) => v + 1); }} />
      ) : null}
      {fileKind && fileKind !== kind ? (
        <p className="flex items-start gap-2 rounded-2xl border border-warn-line bg-warn px-4 py-3 text-sm font-semibold text-warn-ink">
          <Icon name="shield" size={18} className="mt-0.5 shrink-0" />
          {t("form.kindMismatch", { fileKindOf: t(`kindOf.${fileKind}`), kindOf: t(`kindOf.${kind}`), fileKind: t(`kind.${fileKind}`) })}
        </p>
      ) : null}

      {/* the step line: numbered circles joined by a line, a tick on the steps already seen; tap one to go there */}
      <ol aria-label={t("form.stepsAria")} className="flex items-start rounded-3xl border border-line bg-surface px-3 py-3 sm:px-5">
        {STEP_NAMES.map((name, i) => {
          const current = i === step;
          const seenIt = seenSteps.includes(i) && !current;
          const fix = !current && Object.values(marked).some((m) => m.step === i);
          return (
            <li key={name} className="flex min-w-0 flex-1 items-start">
              <button type="button" onClick={() => jump(i)} aria-current={current ? "step" : undefined}
                className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 text-center hover:bg-sunk">
                <span className={`grid size-9 shrink-0 place-items-center rounded-full border-2 font-display text-sm font-bold ${current ? "border-primary bg-primary text-on-primary" : fix ? "border-neg bg-neg-soft text-neg" : seenIt ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-muted"}`}>
                  {seenIt && !fix ? <Icon name="check" size={16} strokeWidth={2.6} /> : n(i + 1)}
                </span>
                <span className={`hidden w-full truncate text-xs sm:block ${current ? "font-bold text-ink" : "text-muted"}`}>{t(name)}</span>
                <span className="sr-only">{current ? t("form.stepCurrent") : fix ? t("form.stepFix") : seenIt ? t("form.stepDone") : ""}</span>
              </button>
              {i < STEPS - 1 ? <span aria-hidden className={`mt-5 h-0.5 w-3 shrink-0 sm:w-6 ${seenSteps.includes(i) && (seenSteps.includes(i + 1) || i + 1 === step) ? "bg-primary" : "bg-line"}`} /> : null}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary">{t("form.step", { n: step + 1, total: STEPS })}</p>
          <h2 className="font-display text-2xl font-bold lg:text-3xl">{title}</h2>
          {hint ? <p className="text-sm text-muted">{hint}</p> : null}
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-60 sm:shrink-0">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">{t("form.progress")}</span>
            <span className="font-bold tabular-nums">{t("form.progressOf", { n: done.n, total: done.total })}</span>
          </div>
          <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("form.progress")} className="h-2 overflow-hidden rounded-full bg-sunk">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <FieldErrors.Provider value={messages}>
      <ActionForm
        key={version}
        check={() => report(examine(0, STEPS - 1), [...Array(STEPS).keys()])}
        onResult={(state) => markFromServer(state.fieldErrors)}
        action={edit ? ACTIONS[viewer].update : ACTIONS[viewer].create}
        submitLabel={submit}
        pendingLabel={family ? t("form.submitting") : undefined}
        footer={(button) => (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            {tried && toFix ? (
              <p role="alert" className="flex items-start gap-2 rounded-2xl bg-neg-soft px-4 py-3 text-sm font-semibold text-neg">
                <Icon name="shield" size={16} className="mt-0.5 shrink-0" />{t("form.fixCount", { n: toFix })}
              </p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">{last ? t("form.lastStepNote") : t("form.laterNote")}</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:shrink-0">
                {step > 0 ? (
                  <button type="button" onClick={() => go(step - 1)} className={quietButton}><Icon name="back" size={18} />{t(STEP_NAMES[step - 1])}</button>
                ) : null}
                {last ? <div className="sm:min-w-56">{button}</div> : (
                  <button type="button" onClick={next} className={primaryButton}>{t("form.nextNamed", { name: t(STEP_NAMES[step + 1]) })}<Icon name="chevronRight" size={18} /></button>
                )}
              </div>
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
              onChange={recheck}
              onInput={recheck}
              onBlur={checkOnLeave}
              // Enter in a text box moves to the next step instead of posting a half-seen form
              onKeyDown={(e) => { if (e.key === "Enter" && !last && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); next(); } }}
            >
              <Hidden name="kind" value={kind} />
              {profile ? <Hidden name="id" value={profile.id} /> : null}

              <Section ref={at(0)} active={step === 0} title={titles[0][0]}>
                <Wide>
                  <Field name="name" maxLength={80} minLength={2} label={t(`form.nameOf.${kind}`)} required defaultValue={v.name} autoComplete="off" placeholder={t("form.fullName")} tag={tags("name", "ghotok")} />
                </Wide>
                <Field name="fatherName" maxLength={80} label={t("form.father")} placeholder={t("form.fatherPlaceholder")} defaultValue={v.fatherName} tag={tags("fatherName", "ghotok")} />
                <Field name="motherName" maxLength={80} label={t("form.mother")} placeholder={t("form.motherPlaceholder")} defaultValue={v.motherName} tag={tags("motherName", "ghotok")} />
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
                <Field name="education" maxLength={120} label={t("form.education")} placeholder={t("form.educationPlaceholder")} defaultValue={v.education} tag={tags("education", "all")} />
                <Field name="profession" maxLength={120} label={t("form.profession")} placeholder={t("form.professionPlaceholder")} defaultValue={v.profession} tag={tags("profession", "all")} />
                <Field name="workplace" maxLength={160} label={t("form.workplace")} placeholder={t("form.workplacePlaceholder")} defaultValue={v.workplace} tag={tags("workplace", "all")} />
                <Field name="monthlyIncome" label={t("form.income")} type="number" inputMode="numeric" min="0" placeholder={t("form.incomePlaceholder")} defaultValue={v.monthlyIncome} tag={tags("monthlyIncome", "ghotok")} />
                <Wide>
                  <Choice name="educationMedium" label={t("form.medium")} options={options("medium", EDUCATION_MEDIUMS)} skip={notSay} defaultValue={v.educationMedium} tag={tags("educationMedium", "all")} />
                </Wide>
              </Section>

              <Section ref={at(2)} active={step === 2} title={titles[2][0]}>
                <Field name="village" maxLength={80} label={t("form.village")} placeholder={t("form.villagePlaceholder")} defaultValue={v.village} tag={tags("village", "ghotok")} />
                <Field name="upazila" maxLength={80} label={t("form.upazila")} placeholder={t("form.upazilaPlaceholder")} defaultValue={v.upazila} tag={tags("upazila", "all")} />
                <Field name="district" maxLength={80} minLength={2} label={t("form.district")} placeholder={t("form.districtPlaceholder")} required defaultValue={v.district} tag={tags("district", "all")} />
                <Field name="presentAddress" maxLength={160} label={t("form.presentAddress")} placeholder={t("form.presentAddressPlaceholder")} defaultValue={v.presentAddress} hint={t("form.presentAddressHint")} tag={tags("presentAddress", "all")} />
              </Section>

              <Section ref={at(3)} active={step === 3} title={titles[3][0]}>
                <Field name="guardianName" maxLength={80} label={t("form.guardianName")} placeholder={t("form.guardianPlaceholder")} defaultValue={v.guardianName} tag={tags("guardianName", "ghotok")} />
                <Field name="guardianPhone" label={t("form.guardianPhone")} type="tel" inputMode="tel" placeholder={t("form.guardianPhonePlaceholder")} defaultValue={v.guardianPhone} tag={tags("guardianPhone", "ghotok")} />
                <Field name="brothers" label={t("form.brothers")} type="number" inputMode="numeric" min="0" max="30" placeholder={t("form.countPlaceholder")} defaultValue={v.brothers} tag={tags("brothers", "all")} />
                <Field name="sisters" label={t("form.sisters")} type="number" inputMode="numeric" min="0" max="30" placeholder={t("form.countPlaceholder")} defaultValue={v.sisters} tag={tags("sisters", "all")} />
                <Wide>
                  <Choice name="familyStatus" label={t("form.familyStatus")} hint={t("form.familyStatusHint")} options={options("famStatus", FAMILY_STATUSES)} skip={notSay} defaultValue={v.familyStatus} tag={tags("familyStatus", "all")} />
                </Wide>
                <Wide>
                  <Field name="religiousPractice" maxLength={300} label={t("form.religiousPractice")} placeholder={t("form.religiousPracticePlaceholder")} defaultValue={v.religiousPractice} tag={tags("religiousPractice", "all")} />
                </Wide>
                <Wide>
                  <TextArea name="familyDetails" maxLength={2000} label={t("form.family")} placeholder={t("form.familyPlaceholder")} defaultValue={v.familyDetails} rows={v.familyDetails && v.familyDetails.length > 120 ? 6 : 3} tag={tags("familyDetails", "all")} />
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
                  <Field name="expectDistricts" maxLength={200} label={t("form.expectDistricts")} placeholder={t("form.expectDistrictsPlaceholder")} defaultValue={v.expectDistricts} hint={t("form.expectDistrictsHint")} tag={tags("expectDistricts", "all")} />
                </Wide>
                <Wide>
                  <TextArea name="expectations" maxLength={2000} label={t("form.expectations")} placeholder={t("form.expectationsPlaceholder")} defaultValue={v.expectations} tag={tags("expectations", "all")} />
                </Wide>
                <Wide>
                  <Field name="photoUrl" maxLength={500} label={t("form.photo")} type="url" inputMode="url" placeholder="https://…" defaultValue={v.photoUrl} hint={t("form.photoHint")} tag={tags("photoUrl", "ghotok")} />
                </Wide>
                {family ? null : (
                  <Wide>
                    <TextArea name="notes" maxLength={2000} label={t("form.notes")} placeholder={t("form.notesPlaceholder")} defaultValue={v.notes} />
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
      </FieldErrors.Provider>
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
