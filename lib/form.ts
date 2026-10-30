import { AppError, messageFor } from "./errors";

/** What a server action returns to a form. */
export interface FormState {
  error?: string;
  /** echoed back after a failed submit so the form keeps what was typed (never passwords) */
  values?: Record<string, string>;
  /** success message to show in place */
  notice?: string;
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
 * Run a service call from a server action. An AppError becomes a Bangla message in the form;
 * anything else (including the redirect signal from Next) is re-thrown untouched.
 */
export async function attempt(fn: () => Promise<FormState | void>, values?: Record<string, string>): Promise<FormState> {
  try {
    return (await fn()) ?? {};
  } catch (e) {
    if (e instanceof AppError) return { error: messageFor(e.code), values };
    throw e;
  }
}
