import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FamilyBiodata } from "@/components/biodata";
import { Icon } from "@/components/icons";
import { ContactButtons } from "@/components/site";
import { PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { browseOne } from "@/lib/services/biodata";
import { publicSite } from "@/lib/services/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("common.biodata") };
}

/** Someone else's biodata as a family sees it: the family's columns only, and the ghotok to call about it. */
export default async function BiodataPage(props: PageProps<"/biodata/[id]">) {
  const [me, T] = await Promise.all([requireCustomer(), getT()]);
  const { t } = T;
  const { id } = await props.params;
  const db = getDb();
  const [b, site] = await Promise.all([browseOne(db, me.ghotokId, id), publicSite(db)]);
  if (!b) notFound();
  const no = T.biodataNo(b.kind, b.code);

  return (
    <>
      <PageHeader title={no} back={`/${b.kind}`} sub={t("bv.sub")} />
      <FamilyBiodata b={b} t={T} aside={site ? (
        <section className="flex flex-col gap-3 rounded-3xl border border-primary-soft bg-primary-soft/40 p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-bold"><Icon name="phone" size={18} className="text-primary" />{t("bv.likeTitle")}</h2>
          <p className="text-sm text-muted">{t("bv.likeText", { no, name: site.ghotokName })}</p>
          <ContactButtons phone={site.phone} whatsapp={site.whatsapp} t={T} />
        </section>
      ) : null} />
    </>
  );
}
