import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { orNotFound } from "@/lib/not-found";
import { getMyBiodata } from "@/lib/services/biodata";
import { MIN_AGE } from "@/lib/services/profiles";
import { currentYear } from "@/lib/time";

export const metadata: Metadata = { title: "বায়োডাটা বদলান" };

export default async function EditMyBiodataPage(props: PageProps<"/me/biodata/[id]/edit">) {
  const me = await requireCustomer();
  const { id } = await props.params;
  const p = await orNotFound(getMyBiodata(getDb(), me.ghotokId, me.id, id));
  const year = currentYear();
  return (
    <>
      <PageHeader title={p.name} back={`/me/biodata/${p.id}`} sub="বদলে জমা দিলে ঘটক আবার দেখে তালিকায় তুলবেন" />
      <div className="lg:max-w-2xl">
        <ProfileForm kind={p.kind} profile={p} minYear={year - 100} maxYear={year - MIN_AGE[p.kind]} viewer="customer" />
      </div>
    </>
  );
}
