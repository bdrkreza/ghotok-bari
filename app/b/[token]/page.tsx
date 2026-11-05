import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { FamilyBiodata } from "@/components/biodata";
import { Icon } from "@/components/icons";
import { LangSwitch } from "@/components/lang-switch";
import { PrintButton } from "@/components/print-button";
import { primaryButton } from "@/components/ui";
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
      {/* stays at the top while the biodata scrolls, so the site and the language switch are always in reach */}
      <header className="henna-edge sticky top-0 z-20 bg-surface pb-2.5 print:static print:pb-0">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4 lg:h-16">
          <span className="flex min-w-0 items-center gap-2 font-display text-lg font-extrabold">
            <Logo className="size-8 shrink-0 rounded-xl outline-2 outline-offset-3 outline-primary outline-dotted" />
            <span className="truncate">{site?.name ?? t("common.brand")}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{t("pub.header")}</span>
            <span className="print:hidden"><LangSwitch /></span>
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 lg:py-10">
        <FamilyBiodata b={b} t={T} aside={
          <>
            <p className="border-t border-line pt-4 font-display text-lg font-bold">{t("bv.likeTitle")}</p>
            <a href={`tel:${b.ghotok.phone}`} className={primaryButton}>
              <Icon name="phone" size={18} />
              <span className="flex flex-col items-start leading-tight">{t("contact.callName", { name: b.ghotok.name })}<span className="text-xs font-semibold opacity-85">{T.n(b.ghotok.phone)}</span></span>
            </a>
            <p className="text-center text-xs text-muted">{t("bv.likeText", { no: T.biodataNo(b.kind, b.code), name: b.ghotok.name })}</p>
            <p className="text-center text-xs text-muted">{t("pub.callText")}</p>
            <PrintButton />
          </>
        } />
      </main>

      <footer className="px-4 py-6 print:py-2 text-center text-xs text-muted">{site?.name ?? t("common.brand")} · {t("common.madeWith")}</footer>
    </div>
  );
}
