import type { Metadata } from "next";
import Link from "next/link";
import { BiodataFormAside } from "@/components/biodata";
import { Icon } from "@/components/icons";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { KIND_LABEL } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { MIN_AGE } from "@/lib/services/profiles";
import { publicSite } from "@/lib/services/site";
import { currentYear } from "@/lib/time";

export const metadata: Metadata = { title: "নতুন বায়োডাটা" };

/** A family writes a biodata. Who it is for comes from ?kind=; the switch at the top changes it. */
export default async function NewBiodataPage(props: PageProps<"/me/biodata/new">) {
  await requireCustomer();
  const [query, site] = await Promise.all([props.searchParams, publicSite(getDb())]);
  const kind = query.kind === "patro" ? "patro" : "patri";
  const year = currentYear();
  return (
    <>
      <PageHeader title="নতুন বায়োডাটা" back="/me" sub="পাঁচটি ছোট ধাপ; তারা-চিহ্ন দেওয়া ঘরগুলো লাগবেই" />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between lg:p-5">
            <div>
              <p className="font-display text-base font-bold">কার বায়োডাটা?</p>
              <p className="text-sm text-muted">নিজের, ছেলে-মেয়ের বা পরিবারের কারও জন্য</p>
            </div>
            <div role="radiogroup" aria-label="কার বায়োডাটা" className="grid grid-cols-2 gap-1 rounded-2xl bg-sunk p-1 sm:w-72">
              {(["patri", "patro"] as const).map((k) => (
                <Link key={k} href={`/me/biodata/new?kind=${k}`} role="radio" aria-checked={k === kind}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl font-bold ${k === kind ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:text-ink"}`}>
                  <Icon name={k === "patro" ? "groom" : "bride"} size={18} />{KIND_LABEL[k]}
                </Link>
              ))}
            </div>
          </div>
          <ProfileForm kind={kind} minYear={year - 100} maxYear={year - MIN_AGE[kind]} viewer="customer" />
        </div>
        <BiodataFormAside site={site} />
      </div>
    </>
  );
}
