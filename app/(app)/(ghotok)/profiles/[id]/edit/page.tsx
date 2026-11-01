import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { orNotFound } from "@/lib/not-found";
import { listPhotos } from "@/lib/services/photos";
import { MIN_AGE, getProfile } from "@/lib/services/profiles";
import { currentYear } from "@/lib/time";
import { photosEnabled } from "@/lib/storage";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("common.edit") };
}

export default async function EditProfilePage(props: PageProps<"/profiles/[id]/edit">) {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const { id } = await props.params;
  const p = await orNotFound(getProfile(getDb(), user.ghotokId, id));
  const photos = await listPhotos(getDb(), user.ghotokId, p.id);
  const year = currentYear();
  return (
    <>
      <PageHeader title={p.name} back={`/profiles/${p.id}`} sub={t("nb.adminEditSub")} />
      <div className="lg:max-w-2xl">
        <ProfileForm kind={p.kind} profile={p} minYear={year - 100} maxYear={year - MIN_AGE[p.kind]} photosOn={photosEnabled()} photos={photos} />
      </div>
    </>
  );
}
