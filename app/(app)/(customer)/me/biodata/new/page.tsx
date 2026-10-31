import type { Metadata } from "next";
import Link from "next/link";
import { BiodataFormAside } from "@/components/biodata";
import { Icon } from "@/components/icons";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { aiAvailable } from "@/lib/biodata-import/ai";
import { getDb } from "@/lib/db";
import { MIN_AGE } from "@/lib/services/profiles";
import { publicSite } from "@/lib/services/site";
import { currentYear } from "@/lib/time";

export const metadata: Metadata = { title: "নতুন বায়োডাটা" };

const KIND_WORD = { patri: "পাত্রী (মেয়ে)", patro: "পাত্র (ছেলে)" } as const;

/** A family writes a biodata. Who it is for comes from ?kind=; the switch at the top changes it. */
export default async function NewBiodataPage(props: PageProps<"/me/biodata/new">) {
  await requireCustomer();
  const [query, site] = await Promise.all([props.searchParams, publicSite(getDb())]);
  const kind = query.kind === "patro" ? "patro" : "patri";
  const year = currentYear();
  return (
    <>
      <PageHeader title="নতুন বায়োডাটা" back="/me" sub="যেটুকু জানেন সেটুকু লিখুন। লাল তারা (*) দেওয়া ঘরগুলো অবশ্যই লাগবে।" />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between lg:p-5">
            <div>
              <p className="font-display text-base font-bold">কার বায়োডাটা দিচ্ছেন?</p>
              <p className="text-sm text-muted">নিজের জন্য, নাকি ছেলে-মেয়ে বা পরিবারের কারও জন্য? একটা বেছে নিন।</p>
            </div>
            <div role="radiogroup" aria-label="কার বায়োডাটা" className="grid grid-cols-2 gap-1 rounded-2xl bg-sunk p-1 sm:w-80">
              {(["patri", "patro"] as const).map((k) => (
                <Link key={k} href={`/me/biodata/new?kind=${k}`} role="radio" aria-checked={k === kind}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl font-bold ${k === kind ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:text-ink"}`}>
                  <Icon name={k === "patro" ? "groom" : "bride"} size={18} />{KIND_WORD[k]}
                </Link>
              ))}
            </div>
          </div>
          <ProfileForm kind={kind} minYear={year - 100} maxYear={year - MIN_AGE[kind]} viewer="customer" importable ai={aiAvailable()} />
        </div>
        <BiodataFormAside site={site} />
      </div>
    </>
  );
}
