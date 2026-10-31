import { describe, expect, it } from "vitest";
import { bn, en } from "@/lib/i18n/dict";
import { makeT, richParts } from "@/lib/i18n";

describe("two languages", () => {
  it("has every phrase in both languages, with the same placeholders", () => {
    const bnKeys = Object.keys(bn).sort();
    const enKeys = Object.keys(en).sort();
    expect(enKeys).toEqual(bnKeys);
    const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const k of bnKeys as (keyof typeof bn)[]) {
      expect(holes(en[k]), k).toEqual(holes(bn[k]));
      expect(en[k].trim(), k).not.toBe("");
    }
  });

  it("writes numbers, money, dates and heights in each language", () => {
    const b = makeT("bn");
    const e = makeT("en");
    expect(b.n(2026)).toBe("২০২৬");
    expect(e.n(2026)).toBe("2026");
    expect(b.money(1234567)).toBe("৳১২,৩৪,৫৬৭");
    expect(e.money(1234567)).toBe("৳12,34,567");
    expect(b.date("2026-10-30")).toMatch(/^৩০ অক্টোবর,? ২০২৬$/);
    expect(e.date("2026-10-30")).toBe("30 October 2026");
    expect(b.height(170)).toBe("৫ ফুট ৭ ইঞ্চি");
    expect(e.height(170)).toBe("5 ft 7 in");
    expect(b.biodataNo("patri", 7)).toBe("পাত্রী-৭");
    expect(e.biodataNo("patri", 7)).toBe("Bride-7");
    expect(b.t("me.pendingLine", { n: 2 })).toBe("আপনার ২টি বায়োডাটা ঘটক দেখছেন।");
    expect(e.t("common.years", { n: 23 })).toBe("23 years");
    expect(e.options("religion", ["islam", "hindu"] as const)).toEqual([["islam", "Islam"], ["hindu", "Hindu"]]);
    expect(richParts("tap **Share** then **Add**")).toEqual([{ text: "tap ", bold: false }, { text: "Share", bold: true }, { text: " then ", bold: false }, { text: "Add", bold: true }]);
  });
});
