import { AppError, fieldMessages, messageFor } from "./errors";
import { makeT } from "./i18n";
import { getLang } from "./i18n/server";

/** What a server action returns to a form. */
export interface FormState {
  error?: string;
  /** echoed back after a failed submit so the form keeps what was typed (never passwords) */
  values?: Record<string, string>;
  /** success message to show in place */
  notice?: string;
  /** a message per refused field, shown under that field */
  fieldErrors?: Record<string, string>;
  /**
   * the biodata the refusal points at: its id and its number as the user reads it ("পাত্রী-৭"); `saved` when it is
   * the one just handed in (its photos failed), not an earlier one
   */
  existing?: { id: string; label: string; saved?: boolean };
}

export const field = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** Every text field of a form as a plain object, for echoing back after an error. */
export function fieldValues(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$") && k !== "password") out[k] = v;
  });
  return out;
}

/**
 * Run a service call from a server action. An AppError becomes a message in the user's language in the form;
 * anything else (including the redirect signal from Next) is re-thrown untouched.
 */
export async function attempt(fn: () => Promise<FormState | void>, values?: Record<string, string>): Promise<FormState> {
  try {
    return (await fn()) ?? {};
  } catch (e) {
    if (e instanceof AppError) {
      const lang = await getLang();
      return {
        error: messageFor(e.code, lang), values,
        ...(e.fields ? { fieldErrors: fieldMessages(e.fields, lang) } : {}),
        ...(e.existing ? { existing: { id: e.existing.id, label: makeT(lang).biodataNo(e.existing.kind, e.existing.code), saved: e.code === "photo_upload_failed" } } : {}),
      };
    }
    throw e;
  }
}
