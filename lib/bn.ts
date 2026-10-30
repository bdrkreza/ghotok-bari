// Bangla text helpers: numerals, money and the labels for every status code.
import type { Approval, LedgerKind, MaritalStatus, ProfileKind, ProfileStatus, ProposalStatus, Religion } from "./db/schema";

const DIGITS = "০১২৩৪৫৬৭৮৯";

/** 1234 -> "১২৩৪" */
export const bn = (n: number | string) => String(n).replace(/\d/g, (d) => DIGITS[Number(d)]);

/** 1234567 -> "১২,৩৪,৫৬৭" (lakh grouping, as written in Bangladesh) */
export function bnNumber(n: number): string {
  const sign = n < 0 ? "-" : "";
  const s = String(Math.abs(Math.round(n)));
  if (s.length <= 3) return sign + bn(s);
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return sign + bn(`${rest},${last3}`);
}

/** 12000 -> "৳১২,০০০" */
export const taka = (n: number) => `৳${bnNumber(n)}`;

export const KIND_LABEL: Record<ProfileKind, string> = { patro: "পাত্র", patri: "পাত্রী" };

export const PROFILE_STATUS: Record<ProfileStatus, { label: string; tone: "mint" | "mango" | "sky" | "lilac" | "coral" }> = {
  active: { label: "খোঁজ চলছে", tone: "mint" },
  engaged: { label: "বিয়ে ঠিক", tone: "mango" },
  married: { label: "বিয়ে হয়েছে", tone: "sky" },
  inactive: { label: "বন্ধ", tone: "coral" },
};

/** Where a family's biodata stands with the ghotok. */
export const APPROVAL: Record<Approval, { label: string; tone: "mint" | "mango" | "sky" | "lilac" | "coral" }> = {
  pending: { label: "অপেক্ষমাণ", tone: "mango" },
  approved: { label: "তালিকায় আছে", tone: "mint" },
  returned: { label: "ফেরত দেওয়া", tone: "coral" },
};

export const PROPOSAL_STATUS: Record<ProposalStatus, { label: string; tone: "mint" | "mango" | "sky" | "lilac" | "coral" }> = {
  prostab: { label: "প্রস্তাব দেওয়া", tone: "lilac" },
  dekha_shona: { label: "দেখাশোনা", tone: "sky" },
  kotha_cholche: { label: "কথা চলছে", tone: "mango" },
  thik_hoyeche: { label: "বিয়ে ঠিক", tone: "mint" },
  biye_hoyeche: { label: "বিয়ে হয়েছে", tone: "mint" },
  bad: { label: "বাদ", tone: "coral" },
};

export const RELIGION: Record<Religion, string> = {
  islam: "ইসলাম",
  hindu: "হিন্দু",
  christian: "খ্রিস্টান",
  buddhist: "বৌদ্ধ",
  other: "অন্যান্য",
};

export const MARITAL: Record<MaritalStatus, string> = {
  obibahito: "অবিবাহিত",
  talakprapto: "তালাকপ্রাপ্ত",
  bidhoba: "বিধবা / বিপত্নীক",
};

export const LEDGER_KIND: Record<LedgerKind, { label: string; hint: string }> = {
  chukti: { label: "চুক্তি", hint: "পরিবারের সাথে ঠিক হওয়া পারিশ্রমিক" },
  joma: { label: "জমা", hint: "হাতে পাওয়া টাকা" },
  khoroch: { label: "খরচ", hint: "যাতায়াত বা অন্য নিজের খরচ" },
};

/** [value, label] pairs for a <select>. */
export const options = <K extends string>(map: Record<K, string | { label: string }>) =>
  (Object.keys(map) as K[]).map((k) => {
    const v = map[k];
    return [k, typeof v === "string" ? v : v.label] as const;
  });

/** 170 -> "৫ ফুট ৭ ইঞ্চি" */
export function heightLabel(cm: number): string {
  const inches = Math.round(cm / 2.54);
  return `${bn(Math.floor(inches / 12))} ফুট ${bn(inches % 12)} ইঞ্চি`;
}

const graphemes = new Intl.Segmenter("bn", { granularity: "grapheme" });

/** The first letter of a name as one Bangla grapheme ("রুমা" -> "রু"), for an avatar circle. */
export function initial(name: string): string {
  const word = name.trim().split(/\s+/)[0] ?? "";
  const first = graphemes.segment(word)[Symbol.iterator]().next().value;
  return first?.segment ?? "?";
}

/** First letters of the first two words: "আব্দুল করিম ঘটক" -> "আক" */
export const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(initial).join("") || "?";

/** The biodata number as families hear it: ("patri", 7) -> "পাত্রী-৭" */
export const biodataNo = (kind: ProfileKind, code: number) => `${KIND_LABEL[kind]}-${bn(code)}`;
