import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FamilyBiodata } from "@/components/biodata";
import { Icon } from "@/components/icons";
import { LangSwitch } from "@/components/lang-switch";
import { currentSite } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { publicBiodata } from "@/lib/services/share";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("common.biodata"), robots: { index: false, follow: false } };
}

/**
 * The public, read-only biodata a family opens from a link the ghotok sent. No sign-in: the token in the URL is
 * the key, and lib/services/share.ts decides what is shown. Public in proxy.ts.
 */
export default async function PublicBiodataPage(props: PageProps<"/b/[token]">) {
  const { token } = await props.params;
  const [b, site, T] = await Promise.all([publicBiodata(getDb(), token), currentSite(), getT()]);
  if (!b) notFound();
  const { t } = T;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="henna-edge relative bg-surface pb-2.5">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4 lg:h-16">
          <span className="flex min-w-0 items-center gap-2 font-display text-lg font-extrabold">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-base text-on-primary outline-2 outline-offset-3 outline-primary outline-dotted">ঘ</span>
            <span className="truncate">{site?.name ?? t("common.alta")}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{t("pub.header")}</span>
            <LangSwitch />
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 lg:py-10">
        <FamilyBiodata b={b} t={T} aside={
          <section className="flex flex-col gap-3 rounded-3xl border border-primary-soft bg-primary-soft/40 p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-bold"><Icon name="phone" size={18} className="text-primary" />{t("pub.callTitle")}</h2>
            <p className="text-sm text-muted">{t("pub.callText")}</p>
            <p className="font-bold">{b.ghotok.name}</p>
            <a href={`tel:${b.ghotok.phone}`} className="inline-flex min-h-12 w-fit items-center gap-2 rounded-2xl bg-primary px-5 font-bold text-on-primary">
              <Icon name="phone" size={18} />{T.n(b.ghotok.phone)}
            </a>
          </section>
        } />
      </main>

      <footer className="px-4 py-6 text-center text-xs text-muted">{site?.name ?? t("common.alta")} · {t("common.madeWith")}</footer>
    </div>
  );
}
