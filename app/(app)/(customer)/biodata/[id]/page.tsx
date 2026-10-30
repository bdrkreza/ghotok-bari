import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FamilyBiodata } from "@/components/biodata";
import { Icon } from "@/components/icons";
import { ContactButtons } from "@/components/site";
import { PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { biodataNo } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { browseOne } from "@/lib/services/biodata";
import { publicSite } from "@/lib/services/site";

export const metadata: Metadata = { title: "বায়োডাটা" };

/** Someone else's biodata as a family sees it: the family's columns only, and the ghotok to call about it. */
export default async function BiodataPage(props: PageProps<"/biodata/[id]">) {
  const me = await requireCustomer();
  const { id } = await props.params;
  const db = getDb();
  const [b, site] = await Promise.all([browseOne(db, me.ghotokId, id), publicSite(db)]);
  if (!b) notFound();
  const no = biodataNo(b.kind, b.code);

  return (
    <>
      <PageHeader title={no} back={`/${b.kind}`} sub="নাম, ছবি ও যোগাযোগ ঘটকের কাছে" />
      <FamilyBiodata b={b} aside={site ? (
        <section className="flex flex-col gap-3 rounded-3xl border border-primary-soft bg-primary-soft/40 p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-bold"><Icon name="phone" size={18} className="text-primary" />পছন্দ হলে ঘটককে বলুন</h2>
          <p className="text-sm text-muted">ফোন করে <span className="font-bold text-ink">{no}</span> নম্বরটি বলুন। {site.ghotokName} দুই পরিবারের সাথে কথা বলে এগোবেন।</p>
          <ContactButtons phone={site.phone} whatsapp={site.whatsapp} />
        </section>
      ) : null} />
    </>
  );
}
