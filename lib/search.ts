// The search bar on the dashboard and the filters it hands to the /patro and /patri lists. Pure helpers shared by
// server and client code, so nothing here touches the database.
import { bn } from "./bn";
import type { ProfileKind } from "./db/schema";

/** Age bands offered in the search bar; the value travels in the URL as ?age=18-25 (41- is open-ended). */
export const AGE_RANGES: readonly { value: string; label: string }[] = [
  { value: "18-25", label: "১৮ – ২৫" },
  { value: "26-30", label: "২৬ – ৩০" },
  { value: "31-35", label: "৩১ – ৩৫" },
  { value: "36-40", label: "৩৬ – ৪০" },
  { value: "41-", label: "৪১+" },
];

/** Height bands in cm, shown in feet and inches as the ghotok says them. */
export const HEIGHT_RANGES: readonly { value: string; label: string }[] = [
  { value: "-151", label: "৫ ফুটের নিচে" },
  { value: "152-162", label: "৫′০″ – ৫′৪″" },
  { value: "163-172", label: "৫′৫″ – ৫′৮″" },
  { value: "173-", label: "৫′৯″ বা বেশি" },
];

/** Lower bounds for monthly income, in taka. */
export const INCOME_MINS: readonly { value: string; label: string }[] = [
  { value: "10000", label: "১০ হাজার+" },
  { value: "20000", label: "২০ হাজার+" },
  { value: "30000", label: "৩০ হাজার+" },
  { value: "50000", label: "৫০ হাজার+" },
  { value: "100000", label: "১ লাখ+" },
];

export interface Band { min?: number; max?: number }
export type AgeBand = Band;

/** "18-25" -> { min: 18, max: 25 }, "41-" -> { min: 41 }, "-151" -> { max: 151 }; anything else -> null */
export function parseBand(value: string | undefined): Band | null {
  const m = /^(\d{1,6})?-(\d{1,6})?$/.exec(value ?? "");
  if (!m || (!m[1] && !m[2])) return null;
  const band: Band = {};
  if (m[1]) band.min = Number(m[1]);
  if (m[2]) band.max = Number(m[2]);
  return band;
}
export const parseAge = parseBand;

/** A whole positive number from the URL, or undefined. */
export const parseAmount = (value: string | undefined): number | undefined =>
  /^\d{1,9}$/.test(value ?? "") ? Number(value) : undefined;

/** A biodata number as typed: "পাত্রী-৭", "৭" or "7" -> 7; nothing numeric -> undefined */
export function parseNo(value: string | undefined): number | undefined {
  const digits = (value ?? "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/\D/g, "");
  return digits && digits.length <= 9 ? Number(digits) : undefined;
}

const label = (ranges: readonly { value: string; label: string }[], value: string) => ranges.find((r) => r.value === value)?.label ?? bn(value);
/** The band as the ghotok reads it: "১৮ – ২৫" */
export const ageLabel = (value: string) => label(AGE_RANGES, value);
export const heightLabelFor = (value: string) => label(HEIGHT_RANGES, value);
export const incomeLabel = (value: string) => label(INCOME_MINS, value);

/** A district and upazila pair as written on someone's profile. */
export interface Place { district: string; upazila: string | null }

/** Everything the /patro and /patri lists read from the URL. All optional; empty means "any". */
export interface ListParams {
  status?: string;
  q?: string;
  /** biodata number */
  no?: string;
  age?: string;
  district?: string;
  upazila?: string;
  religion?: string;
  marital?: string;
  education?: string;
  profession?: string;
  height?: string;
  income?: string;
}

/** /patri?age=18-25&district=কুমিল্লা; empty values are left out */
export function listHref(kind: ProfileKind, params: ListParams): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const s = qs.toString();
  return `/${kind}${s ? `?${s}` : ""}`;
}
