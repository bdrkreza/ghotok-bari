import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FavoriteButton, InterestCard } from "./_components/biodata-actions";
import { FamilyBiodata } from "@/components/biodata";
import { PrintButton } from "@/components/print-button";
import { listPhotos } from "@/lib/services/photos";
import { ContactButtons } from "@/components/site";
import { requireCustomer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { browseOne, myBiodata } from "@/lib/services/biodata";
import { isFavorite, myInterestIn } from "@/lib/services/interests";
import { publicSite } from "@/lib/services/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("common.biodata") };
}

/**
 * Someone else's biodata as a family sees it: the family's columns only, "আগ্রহ জানান" to the ghotok, the short list,
 * printing, and the ghotok to call about it.
 */
export default async function BiodataPage(props: PageProps<"/biodata/[id]">) {
  const [me, T] = await Promise.all([requireCustomer(), getT()]);
  const { t } = T;
  const { id } = await props.params;
  const db = getDb();
  const [b, site, sent, fav, mine] = await Promise.all([
    browseOne(db, me.ghotokId, id), publicSite(db), myInterestIn(db, me.ghotokId, me.id, id), isFavorite(db, me.ghotokId, me.id, id), myBiodata(db, me.ghotokId, me.id),
  ]);
  if (!b) notFound();
  const photos = b.showPhotos ? await listPhotos(db, me.ghotokId, id) : [];
  const no = T.biodataNo(b.kind, b.code);
  // the family's own listed biodata of the other kind: who this one might be for
  const own = mine.filter((p) => p.approval === "approved" && p.kind !== b.kind).map((p) => [p.id, `${p.name} · ${T.biodataNo(p.kind, p.code)}`] as const);

  return (
    <>
      {/* the number is the card's headline; this one is for screen readers and the tab's outline */}
      <h1 className="sr-only">{no}</h1>
      <FamilyBiodata b={b} t={T} photos={photos} aside={
        <>
          <div className="print:hidden flex flex-col gap-3 border-t border-line pt-4">
            <p className="font-display text-lg font-bold">{t("bv.interestTitle")}</p>
            {b.status === "active" ? (
              <InterestCard id={id} own={own} sent={sent ? { status: sent.status, at: T.date(sent.createdAt) } : null} />
            ) : null}
            <FavoriteButton id={id} on={fav} />
            <PrintButton />
          </div>
          {site ? (
            <>
              <p className="border-t border-line pt-4 font-display text-lg font-bold">{t("bv.likeTitle")}</p>
              <ContactButtons phone={site.phone} whatsapp={site.whatsapp} t={T} stack text={t("bv.whatsappAbout", { no })} />
              <p className="text-center text-xs text-muted">{t("bv.likeText", { no, name: site.ghotokName })}</p>
            </>
          ) : null}
        </>
      } />
    </>
  );
}
