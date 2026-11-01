import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { aiAvailable } from "@/lib/biodata-import/ai";
import { getT } from "@/lib/i18n/server";
import { MIN_AGE } from "@/lib/services/profiles";
import { currentYear } from "@/lib/time";
import { photosEnabled } from "@/lib/storage";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("common.new") };
}

export default async function NewProfilePage(props: PageProps<"/profiles/new">) {
  const [, { t }] = await Promise.all([requireAdmin(), getT()]);
  const query = await props.searchParams;
  const kind = query.kind === "patri" ? "patri" : "patro";
  const year = currentYear();
  return (
    <>
      <PageHeader title={t("nb.adminTitle", { kind: t(`kind.${kind}`) })} back={`/${kind}`} sub={t("nb.adminSub")} />
      {/* a form reads best in one narrow column, even on a wide screen */}
      <div className="lg:max-w-2xl">
        <ProfileForm kind={kind} minYear={year - 100} maxYear={year - MIN_AGE[kind]} importable ai={aiAvailable()} photosOn={photosEnabled()} />
      </div>
    </>
  );
}
