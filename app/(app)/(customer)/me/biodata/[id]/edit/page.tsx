import type { Metadata } from "next";
import { BiodataFormAside } from "@/components/biodata";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { orNotFound } from "@/lib/not-found";
import { getMyBiodata } from "@/lib/services/biodata";
import { listPhotos } from "@/lib/services/photos";
import { MIN_AGE } from "@/lib/services/profiles";
import { publicSite } from "@/lib/services/site";
import { currentYear } from "@/lib/time";
import { photosEnabled } from "@/lib/storage";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nb.editTitle") };
}

export default async function EditMyBiodataPage(props: PageProps<"/me/biodata/[id]/edit">) {
  const [me, T] = await Promise.all([requireCustomer(), getT()]);
  const { id } = await props.params;
  const db = getDb();
  const [p, site] = await Promise.all([orNotFound(getMyBiodata(db, me.ghotokId, me.id, id)), publicSite(db)]);
  const photos = await listPhotos(db, me.ghotokId, p.id);
  const year = currentYear();
  return (
    <>
      <PageHeader title={p.name} back={`/me/biodata/${p.id}`} sub={T.t("nb.editSub")} />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
        <ProfileForm kind={p.kind} profile={p} minYear={year - 100} maxYear={year - MIN_AGE[p.kind]} viewer="customer" photosOn={photosEnabled()} photos={photos} />
        <BiodataFormAside site={site} t={T} />
      </div>
    </>
  );
}
