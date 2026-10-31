"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { FormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

/** The text-box look; shared with selects elsewhere, e.g. the dashboard search bar. */
export const inputClass = "min-h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40";

interface FieldProps {
  name: string;
  /** defaults to `name`; set it when two forms on one page have a field of the same name */
  id?: string;
  label: string;
  type?: "text" | "tel" | "password" | "date" | "number" | "url";
  autoComplete?: string;
  inputMode?: "text" | "tel" | "numeric" | "decimal" | "email" | "url";
  required?: boolean;
  min?: string;
  max?: string;
  maxLength?: number;
  placeholder?: string;
  hint?: string;
  defaultValue?: string;
  /** a small chip after the label, e.g. who gets to see this field */
  tag?: ReactNode;
}

export function Field({ name, label, type = "text", hint, required = false, id = name, tag, ...rest }: FieldProps) {
  // a password can be shown, so a typing slip on a phone is seen before it is sent
  const [shown, setShown] = useState(false);
  const { t } = useT();
  const isPassword = type === "password";
  const input = (
    <input
      id={id}
      name={name}
      type={isPassword && shown ? "text" : type}
      required={required}
      aria-describedby={hint ? `${id}-hint` : undefined}
      className={`${inputClass} ${isPassword ? "pr-14" : ""}`}
      {...(isPassword ? { autoCapitalize: "none", autoCorrect: "off", spellCheck: false } : {})}
      {...rest}
    />
  );
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-bold text-muted">{label}{required ? <span className="text-neg"> *</span> : null}{tag ? <span className="ml-2 inline-flex align-middle">{tag}</span> : null}</label>
      {isPassword ? (
        <div className="relative">
          {input}
          <button
            type="button" onClick={() => setShown((s) => !s)} aria-pressed={shown} aria-controls={id}
            aria-label={shown ? t("common.hidePassword") : t("common.showPassword")}
            className="absolute inset-y-0 right-1 grid w-12 place-items-center rounded-xl text-muted"
          >
            <Icon name={shown ? "eyeOff" : "eye"} size={20} />
          </button>
        </div>
      ) : input}
      {hint ? <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function TextArea({ name, label, hint, defaultValue, placeholder, rows = 3, required = false, id = name, tag }: {
  name: string; id?: string; label: string; hint?: string; defaultValue?: string; placeholder?: string; rows?: number; required?: boolean; tag?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-bold text-muted">{label}{tag ? <span className="ml-2 inline-flex align-middle">{tag}</span> : null}</label>
      <textarea id={id} name={name} rows={rows} defaultValue={defaultValue} placeholder={placeholder} required={required}
        className={`${inputClass} py-3 leading-relaxed`} />
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

interface SelectProps {
  name: string;
  id?: string;
  label: string;
  options: readonly (readonly [value: string, text: string])[];
  defaultValue?: string;
  hint?: string;
  /** an empty first choice, e.g. "বেছে নিন" */
  placeholder?: string;
  required?: boolean;
  tag?: ReactNode;
}

export function Select({ name, label, options, hint, defaultValue, placeholder, required = false, id = name, tag }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-bold text-muted">{label}{required ? <span className="text-neg"> *</span> : null}{tag ? <span className="ml-2 inline-flex align-middle">{tag}</span> : null}</label>
      <select id={id} name={name} defaultValue={defaultValue ?? (placeholder ? "" : undefined)} required={required} className={`${inputClass} px-3`}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

interface ChoiceProps {
  name: string;
  /** defaults to `name` */
  id?: string;
  label: string;
  hint?: string;
  options: readonly (readonly [value: string, text: string])[];
  defaultValue?: string;
  /** the wording of the "" answer ("বলতে চাই না"), shown as a dashed chip; without it one of the options is always on */
  skip?: string;
  /** a small chip at the card's top right, e.g. who gets to see this answer */
  tag?: ReactNode;
  /** short answers (blood groups) in equal cells instead of a flowing row */
  grid?: boolean;
}

/**
 * A pick-one question as a card of tappable chips: every answer in view, one tap to choose, the chosen one filled in
 * the accent with a tick. Plain radio inputs underneath, so it posts like a select and works without JavaScript.
 */
export function Choice({ name, id = name, label, hint, options, defaultValue = "", skip, tag, grid = false }: ChoiceProps) {
  const all: readonly (readonly [string, string])[] = skip ? [...options, ["", skip]] : options;
  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id={`${id}-label`} className="font-bold">{label}</p>
          {hint ? <p className="text-sm text-muted">{hint}</p> : null}
        </div>
        {tag ? <span className="shrink-0">{tag}</span> : null}
      </div>
      <div className={grid ? "grid grid-cols-4 gap-2 sm:grid-cols-5" : "flex flex-wrap gap-2"}>
        {all.map(([value, text]) => {
          const isSkip = value === "";
          return (
            <label key={value} className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border bg-surface px-3.5 text-[15px] select-none has-checked:border-primary has-checked:bg-primary has-checked:font-bold has-checked:text-on-primary has-focus-visible:ring-2 has-focus-visible:ring-primary/40 ${isSkip ? "border-dashed border-line font-medium text-muted" : "border-line font-semibold hover:border-primary/50"} ${grid ? `justify-center px-2 ${isSkip ? "col-span-2" : ""}` : ""}`}>
              <input type="radio" name={name} value={value} defaultChecked={defaultValue === value} className="peer sr-only" />
              <Icon name="check" size={14} strokeWidth={2.6} className="hidden peer-checked:inline" />
              {text}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** A plain yes/no tick box, e.g. "আমাকে মনে রাখুন". Sends "on" when ticked, nothing when not. */
export function Checkbox({ name, label, defaultChecked = false, id = name }: { name: string; id?: string; label: string; defaultChecked?: boolean }) {
  return (
    <label htmlFor={id} className="flex items-center gap-3">
      <input id={id} type="checkbox" name={name} defaultChecked={defaultChecked} className="size-5 shrink-0 accent-primary" />
      <span>{label}</span>
    </label>
  );
}

/** A required tick box used instead of a confirm() dialog for actions that cannot be undone. */
export function ConfirmCheck({ name = "confirm", label, defaultChecked = false }: { name?: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-start gap-3 text-sm font-semibold">
      <input type="checkbox" name={name} required defaultChecked={defaultChecked} className="mt-0.5 size-5 shrink-0 accent-primary" />
      <span>{label}</span>
    </label>
  );
}

const TONES = {
  primary: "bg-primary text-on-primary",
  danger: "border border-neg text-neg",
  quiet: "border border-line bg-surface text-ink",
};

interface ActionFormProps {
  action: Action;
  submitLabel: ReactNode;
  pendingLabel?: ReactNode;
  /** receives the values echoed back after a failed submit, and the whole state */
  children?: (values: Record<string, string>, state: FormState) => ReactNode;
  tone?: keyof typeof TONES;
  /** clear the fields after a successful submit that stays on the page */
  resetOnSuccess?: boolean;
  /** lay the fields and button out in one row (small inline forms) */
  inline?: boolean;
  /** a small button, for a row of items (e.g. delete one entry) */
  compact?: boolean;
  /** spoken name of the button when its label is only an icon */
  submitAriaLabel?: string;
  /** draws the form's foot around the submit button (e.g. a wizard's previous / next row); the button is passed in */
  footer?: (submit: ReactNode) => ReactNode;
}

/** A form bound to a server action: shows the returned error or notice, disables the button while it runs. */
export function ActionForm({
  action, submitLabel, pendingLabel, children, tone = "primary",
  resetOnSuccess = false, inline = false, compact = false, submitAriaLabel, footer,
}: ActionFormProps) {
  const { t } = useT();
  const waiting = pendingLabel ?? t("common.wait");
  const [state, formAction, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state.notice && !state.error) ref.current?.reset();
  }, [state, resetOnSuccess]);
  const size = compact ? "min-h-10 rounded-xl px-3 text-sm" : "min-h-12 rounded-2xl px-4 py-3 text-base";
  const button = (
    <button type="submit" disabled={pending} aria-label={submitAriaLabel}
      className={`inline-flex items-center justify-center gap-1.5 font-bold disabled:opacity-60 ${size} ${inline ? "shrink-0" : "w-full"} ${TONES[tone]}`}>
      {pending ? (compact ? "…" : waiting) : submitLabel}
    </button>
  );
  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        // Submitting through onSubmit (not <form action>) keeps the fields as typed after an error.
        e.preventDefault();
        const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(data));
      }}
      className="flex flex-col gap-4"
    >
      {inline ? (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">{children?.(state.values ?? {}, state)}</div>
          {button}
        </div>
      ) : children?.(state.values ?? {}, state)}
      {state.error ? <p role="alert" className="rounded-2xl bg-neg-soft px-4 py-3 text-sm font-semibold text-neg">{state.error}</p> : null}
      {state.notice ? <p role="status" className="rounded-2xl bg-pos-soft px-4 py-3 text-sm font-semibold text-pos">{state.notice}</p> : null}
      {inline ? null : footer ? footer(button) : button}
    </form>
  );
}
