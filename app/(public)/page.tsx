import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { LangSwitch } from "@/components/lang-switch";
import { ContactButtons, HowItWorks } from "@/components/site";
import { ThemeButton } from "@/components/theme";
import { outlineButton, primaryButton, quietButton } from "@/components/ui";
import { getSessionUser, homeFor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import type { Key } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { publicSite } from "@/lib/services/site";

const PROMISES: { icon: IconName; title: Key; text: Key }[] = [
  { icon: "lock", title: "front.promise1Title", text: "front.promise1Text" },
  { icon: "people", title: "front.promise2Title", text: "front.promise2Text" },
  { icon: "shield", title: "front.promise3Title", text: "front.promise3Text" },
];

/**
 * The ghotok's front page, for anyone who has the address: who the ghotok is, how many people are looking, how it
 * works, and how to get in touch. Signed-in people go straight to their own screen.
 */
export default async function FrontPage() {
  const [user, T] = await Promise.all([getSessionUser(), getT()]);
  if (user) redirect(homeFor(user.role));
  const { t } = T;
  const site = await publicSite(getDb());
  if (!site) redirect("/setup");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="henna-edge sticky top-0 z-20 bg-bg/90 pb-2.5 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4 lg:h-18 lg:max-w-6xl lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-display text-lg font-extrabold">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-base text-on-primary outline-2 outline-offset-3 outline-primary outline-dotted lg:size-10 lg:text-lg">ঘ</span>
            <span className="truncate">{site.name}</span>
          </Link>
          <nav aria-label={t("front.account")} className="flex shrink-0 items-center gap-2">
            <LangSwitch />
            <ThemeButton />
            <Link href="/login" className={`${quietButton} min-h-10 px-3 text-sm`}>{t("front.login")}</Link>
            <Link href="/register" className={`${primaryButton} hidden min-h-10 px-3 text-sm sm:inline-flex`}>{t("front.register")}</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6 lg:max-w-6xl lg:gap-10 lg:px-8 lg:py-12">
        <section className="henna-corner flex flex-col gap-6 rounded-3xl border border-primary-soft bg-linear-to-br from-primary-soft/60 via-bg to-surface p-5 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center lg:gap-10 lg:p-12">
          <div className="flex flex-col items-start gap-4">
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">{site.tagline ?? t("site.defaultTagline")}</span>
            <h1 className="font-display text-3xl/[1.2] font-extrabold text-balance lg:text-5xl/[1.15]">{site.name}</h1>
            <p className="text-muted lg:text-lg">{site.about ?? t("site.defaultAbout")}</p>
            {site.address ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-muted"><Icon name="location" size={18} className="text-primary" />{site.address}</p>
            ) : null}
            <div className="grid w-full grid-cols-2 gap-3 sm:flex">
              <Link href="/register" className={primaryButton}>{t("front.registerCta")}</Link>
              <Link href="/login" className={outlineButton}>{t("front.login")}</Link>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <Count icon="groom" value={T.n(site.patro)} label={t("front.patroLooking")} />
            <Count icon="bride" value={T.n(site.patri)} label={t("front.patriLooking")} />
          </dl>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-primary">{t("front.howEyebrow")}</p>
            <h2 className="font-display text-xl font-bold lg:text-2xl">{t("front.howTitle")}</h2>
          </div>
          <HowItWorks t={T} />
        </section>

        <section aria-label={t("front.promises")} className="grid gap-4 rounded-3xl bg-sky/40 p-5 sm:grid-cols-3 lg:p-6">
          {PROMISES.map((p) => (
            <div key={p.title} className="flex items-start gap-4">
              <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-bg"><Icon name={p.icon} size={22} /></span>
              <span className="flex flex-col">
                <span className="font-bold">{t(p.title)}</span>
                <span className="text-sm text-muted">{t(p.text)}</span>
              </span>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:p-8">
          <div className="flex items-center gap-4">
            <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-2xl font-bold text-primary">ঘ</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">{t("common.ghotok")}</p>
              <p className="font-display text-xl font-bold">{site.ghotokName}</p>
              <p className="text-sm text-muted">{t("front.ghotokText")}</p>
            </div>
          </div>
          <ContactButtons phone={site.phone} whatsapp={site.whatsapp} t={T} className="lg:w-96 lg:shrink-0" />
        </section>
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-md px-4 py-5 text-center text-sm text-muted lg:max-w-6xl lg:px-8">{site.name} · {t("common.madeWith")}</p>
      </footer>
    </div>
  );
}

function Count({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 lg:p-5">
      <span aria-hidden className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={icon} size={22} /></span>
      <dd className="font-display text-3xl font-bold tabular-nums lg:text-4xl">{value}</dd>
      <dt className="text-sm text-muted">{label}</dt>
    </div>
  );
}
