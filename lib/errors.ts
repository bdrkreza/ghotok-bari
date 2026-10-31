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
  | "file_too_big"
  | "pledge_required";

export class AppError extends Error {
  constructor(public readonly code: AppErrorCode, detail?: string) {
    super(detail ?? code);
    this.name = "AppError";
  }
}

export function messageFor(code: AppErrorCode, lang: Lang = "bn"): string {
  return makeT(lang).t(`err.${code}`);
}
