import type { Metadata } from "next";
import Link from "next/link";
import { SiteForm } from "./_components/site-form";
import { Card, PageHeader } from "@/components/ui";
import { requireAdmin, requireSite } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("sf.title") };
}

/** The front page's words and the ghotok's contact details, as set at /setup, changed here. */
export default async function SitePage() {
  const [, site, { t }] = await Promise.all([requireAdmin(), requireSite(), getT()]);
  return (
    <>
      <PageHeader title={t("sf.title")} back="/dashboard" sub={t("sf.sub")} />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <Card>
          <SiteForm site={{ name: site.name, tagline: site.tagline ?? "", about: site.about ?? "", address: site.address ?? "", whatsapp: site.whatsapp ?? "" }} />
        </Card>
        <Card title={t("sf.whereTitle")}>
          <p className="text-sm text-muted">{t("sf.whereText")}</p>
          <Link href="/" className="text-sm font-bold text-primary">{t("sf.open")} →</Link>
        </Card>
      </div>
    </>
  );
}
