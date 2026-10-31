import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FamilyBiodata } from "@/components/biodata";
import { ContactButtons } from "@/components/site";
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
      {/* the number is the card's headline; this one is for screen readers and the tab's outline */}
      <h1 className="sr-only">{no}</h1>
      <FamilyBiodata b={b} t={T} aside={site ? (
        <>
          <ContactButtons phone={site.phone} whatsapp={site.whatsapp} t={T} stack />
          <p className="text-center text-xs text-muted">{t("bv.likeText", { no, name: site.ghotokName })}</p>
        </>
      ) : null} />
    </>
  );
}
