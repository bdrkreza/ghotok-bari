"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inputClass } from "./form";
import { Icon } from "./icons";
import { KIND_LABEL } from "@/lib/bn";
import type { ProfileKind } from "@/lib/db/schema";
import { AGE_RANGES, listHref, type Place } from "@/lib/search";

/**
 * The search bar in the dashboard hero: who (পাত্রী / পাত্র), an age band, a district and an upazila, all from
 * what this ghotok has already written down. Submitting opens the matching list with those filters applied.
 */
export function HomeSearch({ places }: { places: Place[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<ProfileKind>("patri");
  const [age, setAge] = useState("");
  const [district, setDistrict] = useState("");
  const [upazila, setUpazila] = useState("");
  const districts = [...new Set(places.map((p) => p.district))];
  const upazilas = [...new Set(places.filter((p) => p.upazila && (!district || p.district === district)).map((p) => p.upazila as string))];

  return (
    <form
      role="search" aria-label="পাত্র-পাত্রী খুঁজুন"
      onSubmit={(e) => { e.preventDefault(); router.push(listHref(kind, { age, district, upazila })); }}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lg shadow-ink/5 lg:flex-row lg:items-end"
    >
      <div role="radiogroup" aria-label="কাকে খুঁজছেন" className="flex gap-1.5 self-start">
        {(["patri", "patro"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
            className={`min-h-12 rounded-xl px-4 font-bold ${kind === k ? "bg-primary text-on-primary" : "bg-sunk text-ink"}`}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:contents">
        <Choice id="home-age" label="বয়স" value={age} onChange={setAge} blank="সব বয়স" options={AGE_RANGES.map((r) => [r.value, r.label] as const)} />
        <Choice id="home-district" label="জেলা" value={district} onChange={(v) => { setDistrict(v); setUpazila(""); }} blank="সব জেলা" options={districts.map((d) => [d, d] as const)} />
        <div className="col-span-2 lg:contents">
          <Choice id="home-upazila" label="উপজেলা" value={upazila} onChange={setUpazila} blank="যেকোনো" options={upazilas.map((u) => [u, u] as const)} />
        </div>
      </div>
      <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-on-primary lg:shrink-0">
        <Icon name="search" size={18} />খুঁজুন
      </button>
    </form>
  );
}

function Choice({ id, label, value, onChange, blank, options }: {
  id: string; label: string; value: string; onChange: (v: string) => void; blank: string; options: (readonly [value: string, text: string])[];
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-bold text-muted">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} px-3`}>
        <option value="">{blank}</option>
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </div>
  );
}
