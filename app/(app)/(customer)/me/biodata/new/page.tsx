import type { Metadata } from "next";
import Link from "next/link";
import { BiodataFormAside } from "@/components/biodata";
import { Icon } from "@/components/icons";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { aiAvailable } from "@/lib/biodata-import/ai";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { MIN_AGE } from "@/lib/services/profiles";
import { publicSite } from "@/lib/services/site";
import { currentYear } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nb.title") };
}

/** A family writes a biodata. Who it is for comes from ?kind=; the switch at the top changes it. */
export default async function NewBiodataPage(props: PageProps<"/me/biodata/new">) {
  const [, T] = await Promise.all([requireCustomer(), getT()]);
  const { t } = T;
  const [query, site] = await Promise.all([props.searchParams, publicSite(getDb())]);
  const kind = query.kind === "patro" ? "patro" : "patri";
  const year = currentYear();
  return (
    <>
      <PageHeader title={t("nb.title")} back="/me" sub={t("nb.sub")} />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between lg:p-5">
            <div>
              <p className="font-display text-base font-bold">{t("nb.whose")}</p>
              <p className="text-sm text-muted">{t("nb.whoseText")}</p>
            </div>
            <div role="radiogroup" aria-label={t("nb.whoseAria")} className="grid grid-cols-2 gap-1 rounded-2xl bg-sunk p-1 sm:w-80">
              {(["patri", "patro"] as const).map((k) => (
                <Link key={k} href={`/me/biodata/new?kind=${k}`} role="radio" aria-checked={k === kind}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl font-bold ${k === kind ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:text-ink"}`}>
                  <Icon name={k === "patro" ? "groom" : "bride"} size={18} />{t(`kindWord.${k}`)}
                </Link>
              ))}
            </div>
          </div>
          <ProfileForm kind={kind} minYear={year - 100} maxYear={year - MIN_AGE[kind]} viewer="customer" importable ai={aiAvailable()} />
        </div>
        <BiodataFormAside site={site} t={T} />
      </div>
    </>
  );
}
