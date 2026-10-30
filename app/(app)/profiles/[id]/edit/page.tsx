import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { orNotFound } from "@/lib/not-found";
import { MIN_AGE, getProfile } from "@/lib/services/profiles";
import { currentYear } from "@/lib/time";

export const metadata: Metadata = { title: "সম্পাদনা" };

export default async function EditProfilePage(props: PageProps<"/profiles/[id]/edit">) {
  const user = await requireUser();
  const { id } = await props.params;
  const p = await orNotFound(getProfile(getDb(), user.id, id));
  const year = currentYear();
  return (
    <>
      <PageHeader title={p.name} back={`/profiles/${p.id}`} sub="তথ্য বদলান" />
      <div className="lg:max-w-2xl">
        <ProfileForm kind={p.kind} profile={p} minYear={year - 100} maxYear={year - MIN_AGE[p.kind]} />
      </div>
    </>
  );
}
