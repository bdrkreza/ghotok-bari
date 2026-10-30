import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { KIND_LABEL } from "@/lib/bn";
import { MIN_AGE } from "@/lib/services/profiles";
import { currentYear } from "@/lib/time";

export const metadata: Metadata = { title: "নতুন বায়োডাটা" };

/** A family writes a biodata. Who it is for comes from ?kind=; the two buttons at the top switch. */
export default async function NewBiodataPage(props: PageProps<"/me/biodata/new">) {
  await requireCustomer();
  const query = await props.searchParams;
  const kind = query.kind === "patro" ? "patro" : "patri";
  const year = currentYear();
  return (
    <>
      <PageHeader title={`${KIND_LABEL[kind]}ের বায়োডাটা`} back="/me" sub="যতটুকু জানেন ততটুকুই লিখুন। জমা দিলে ঘটক দেখে তালিকায় তুলবেন।" />
      <div className="flex flex-col gap-4 lg:max-w-2xl">
        <div role="radiogroup" aria-label="কার বায়োডাটা" className="grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-surface p-1.5">
          {(["patri", "patro"] as const).map((k) => (
            <Link key={k} href={`/me/biodata/new?kind=${k}`} role="radio" aria-checked={k === kind}
              className={`inline-flex min-h-11 items-center justify-center rounded-xl font-bold ${k === kind ? "bg-primary text-on-primary" : "text-muted"}`}>
              {KIND_LABEL[k]}
            </Link>
          ))}
        </div>
        <ProfileForm kind={kind} minYear={year - 100} maxYear={year - MIN_AGE[kind]} viewer="customer" />
      </div>
    </>
  );
}
