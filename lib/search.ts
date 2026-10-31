// The search bar on the dashboard and the filters it hands to the /patro and /patri lists. Pure helpers shared by
// server and client code, so nothing here touches the database.
import type { ProfileKind } from "./db/schema";
import type { Key, T } from "./i18n";

/** Age bands offered in the search bar; the value travels in the URL as ?age=18-25 (41- is open-ended). */
export const AGE_RANGES = ["18-25", "26-30", "31-35", "36-40", "41-"] as const;
/** Height bands in cm, shown in feet and inches as the ghotok says them. */
export const HEIGHT_RANGES = ["-151", "152-162", "163-172", "173-"] as const;
/** Lower bounds for monthly income, in taka. */
export const INCOME_MINS = ["10000", "20000", "30000", "50000", "100000"] as const;

export type BandGroup = "age" | "height" | "income";
const BANDS: Record<BandGroup, readonly string[]> = { age: AGE_RANGES, height: HEIGHT_RANGES, income: INCOME_MINS };
const FIXED: Record<string, Key> = {
  "-151": "range.under5ft", "152-162": "range.h152", "163-172": "range.h163", "173-": "range.h173",
  "10000": "range.k10", "20000": "range.k20", "30000": "range.k30", "50000": "range.k50", "100000": "range.lakh1",
};

/** The band as a person reads it, in their language: "১৮ – ২৫", "5′0″ – 5′4″", "১০ হাজার+". */
export function bandLabel(t: T, group: BandGroup, value: string): string {
  if (FIXED[value]) return t.t(FIXED[value]);
  const m = /^(\d+)-(\d+)?$/.exec(value);
  if (group === "age" && m) return m[2] ? t.t("range.age", { a: Number(m[1]), b: Number(m[2]) }) : t.t("range.agePlus", { a: Number(m[1]) });
  return t.n(value);
}

/** Every band of a group with its label, for a <select>. */
export const bandOptions = (t: T, group: BandGroup) => BANDS[group].map((value) => ({ value, label: bandLabel(t, group, value) }));

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
