import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { KIND_LABEL } from "@/lib/bn";
import { MIN_AGE } from "@/lib/services/profiles";
import { currentYear } from "@/lib/time";

export const metadata: Metadata = { title: "নতুন" };

export default async function NewProfilePage(props: PageProps<"/profiles/new">) {
  await requireAdmin();
  const query = await props.searchParams;
  const kind = query.kind === "patri" ? "patri" : "patro";
  const year = currentYear();
  return (
    <>
      <PageHeader title={`নতুন ${KIND_LABEL[kind]}`} back={`/${kind}`} sub="যতটুকু জানেন ততটুকুই লিখুন; পরে বদলানো যাবে।" />
      {/* a form reads best in one narrow column, even on a wide screen */}
      <div className="lg:max-w-2xl">
        <ProfileForm kind={kind} minYear={year - 100} maxYear={year - MIN_AGE[kind]} />
      </div>
    </>
  );
}
