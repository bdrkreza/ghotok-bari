import type { ProfileKind } from "../db/schema";
import { bn as BN, en as EN, type Key } from "./dict";

// Two languages, one dictionary each (dict.ts). makeT(lang) gives a page everything that depends on the language:
// the words, digits (০১২ or 012), grouped numbers and money, dates, heights and the biodata number. Server code
// gets it from lib/i18n/server.ts (the cookie), client components from lib/i18n/client.tsx (a context).

export type Lang = "bn" | "en";
export const LANGS: readonly Lang[] = ["bn", "en"];
export const DEFAULT_LANG: Lang = "bn";
export const LANG_COOKIE = "lang";
export const isLang = (v: unknown): v is Lang => v === "bn" || v === "en";
export type { Key };

const DICT: Record<Lang, Record<Key, string>> = { bn: BN, en: EN };
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const DATE: Record<Lang, Intl.DateTimeFormat> = {
  bn: new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric" }),
  en: new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric" }),
};
const BN_DAY = new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "long" });
const BN_TIME = new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit", dayPeriod: "short" });
const EN_DATE_TIME = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });
const DATE_TIME: Record<Lang, (d: Date) => string> = {
  // "৪ নভেম্বর, বিকাল ৩:৩০": the part of the day before the time, as it is said; ICU writes "৪ নভেম্বর এ ৩:৩০ PM"
  bn: (d) => {
    const parts = BN_TIME.formatToParts(d);
    const period = parts.find((p) => p.type === "dayPeriod")?.value;
    const time = parts.filter((p) => p.type !== "dayPeriod").map((p) => p.value).join("").trim();
    return `${BN_DAY.format(d)}, ${period ? `${period} ` : ""}${time}`;
  },
  en: (d) => EN_DATE_TIME.format(d),
};
const toDate = (value: string | Date) => (typeof value === "string" ? new Date(`${value}T00:00:00+06:00`) : value);

export interface T {
  lang: Lang;
  /** a phrase, with {placeholders} filled in; numbers in `vars` are written in the language's digits */
  t(key: Key, vars?: Record<string, string | number>): string;
  /** digits only: 1234 -> "১২৩৪" or "1234" */
  n(x: number | string): string;
  /** grouped the Bangladeshi way: 1234567 -> "১২,৩৪,৫৬৭" / "12,34,567" */
  num(x: number): string;
  /** "৳১২,০০০" / "৳12,000" */
  money(x: number): string;
  /** "৩০ অক্টোবর ২০২৬" / "30 October 2026", from "YYYY-MM-DD" or a Date */
  date(d: string | Date): string;
  dateTime(d: Date): string;
  /** 170 -> "৫ ফুট ৭ ইঞ্চি" / "5 ft 7 in" */
  height(cm: number): string;
  /** "পাত্রী-৭" / "Bride-7" */
  biodataNo(kind: ProfileKind, code: number): string;
  /** "২৩ বছর" / "23 years" */
  years(n: number): string;
  /** [value, label] pairs for a <select>, from keys like "religion.islam" */
  options<V extends string>(prefix: string, values: readonly V[]): (readonly [V, string])[];
}

const group = (n: number): string => {
  const sign = n < 0 ? "-" : "";
  const s = String(Math.abs(Math.round(n)));
  if (s.length <= 3) return sign + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${sign}${rest},${last3}`;
};

export function makeT(lang: Lang): T {
  const dict = DICT[lang];
  const n = (x: number | string) => (lang === "bn" ? String(x).replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : String(x));
  const t = (key: Key, vars?: Record<string, string | number>) => {
    const s = dict[key] ?? BN[key] ?? key;
    return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? (typeof vars[k] === "number" ? n(vars[k]) : String(vars[k])) : `{${k}}`)) : s;
  };
  return {
    lang,
    t,
    n,
    num: (x) => n(group(x)),
    money: (x) => `৳${n(group(x))}`,
    date: (d) => DATE[lang].format(toDate(d)),
    dateTime: (d) => DATE_TIME[lang](d),
    height: (cm) => {
      const inches = Math.round(cm / 2.54);
      return t("height", { ft: Math.floor(inches / 12), in: inches % 12 });
    },
    biodataNo: (kind, code) => t("biodataNo", { kind: t(`kind.${kind}` as Key), n: code }),
    years: (x) => t("common.years", { n: x }),
    options: (prefix, values) => values.map((v) => [v, t(`${prefix}.${v}` as Key)] as const),
  };
}

/** Splits "a **bold** b" into plain and bold runs, for the few phrases with emphasis inside. */
export function richParts(s: string): { text: string; bold: boolean }[] {
  return s.split("**").map((text, i) => ({ text, bold: i % 2 === 1 })).filter((p) => p.text);
}
