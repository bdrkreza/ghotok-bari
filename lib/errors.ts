// Every expected failure is an AppError with a stable code. The UI turns codes into a message in the user's
// language (lib/i18n/dict.ts, the "err.*" keys); raw error text never reaches the user.
import { makeT, type Lang } from "./i18n";

export type AppErrorCode =
  | "not_found"
  | "invalid_input"
  | "patro_too_young"
  | "patri_too_young"
  | "same_kind"
  | "proposal_exists"
  | "bad_transition"
  | "amount_required"
  | "forbidden"
  | "self_role"
  | "owner_role"
  | "site_exists"
  | "not_approved"
  | "ask_ghotok"
  | "import_failed"
  | "ai_busy"
  | "file_too_big"
  | "pledge_required";

/** Why one field was refused; the form shows "fe.<code>" from the dictionary under that field, with `vars` filled in. */
export type FieldErrorCode =
  | "required" | "need_name_patro" | "need_name_patri" | "need_birth_year" | "need_district" | "short" | "long" | "number" | "range" | "min" | "phone" | "url" | "choice" | "age_order"
  | "young_patro" | "young_patri" | "pledge";
export interface FieldIssue { code: FieldErrorCode; vars?: Record<string, number> }
export type FieldIssues = Record<string, FieldIssue>;

export class AppError extends Error {
  /** @param fields which form fields were refused and why, so the form can mark each one */
  constructor(public readonly code: AppErrorCode, detail?: string, public readonly fields?: FieldIssues) {
    super(detail ?? code);
    this.name = "AppError";
  }
}

export function messageFor(code: AppErrorCode, lang: Lang = "bn"): string {
  return makeT(lang).t(`err.${code}`);
}

/** Each refused field's message in the user's language. */
export function fieldMessages(fields: FieldIssues, lang: Lang = "bn"): Record<string, string> {
  const { t } = makeT(lang);
  return Object.fromEntries(Object.entries(fields).map(([name, f]) => [name, t(`fe.${f.code}`, f.vars)]));
}
