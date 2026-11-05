import Link from "next/link";
import { Logo } from "@/components/logo";
import { Icon, type IconName } from "@/components/icons";
import { LangSwitch } from "@/components/lang-switch";
import { currentSite } from "@/lib/auth/session";
import type { Key } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";

const FAMILY_FEATURES: { icon: IconName; text: Key }[] = [
  { icon: "lock", text: "auth.familyFeature1" },
  { icon: "people", text: "auth.familyFeature2" },
  { icon: "note", text: "auth.familyFeature3" },
];

const SETUP_FEATURES: { icon: IconName; text: Key }[] = [
  { icon: "people", text: "auth.setupFeature1" },
  { icon: "shield", text: "auth.setupFeature2" },
  { icon: "card", text: "auth.setupFeature3" },
];

/**
 * The sign-in shell, on the ivory ground of a white saree. Phone: a one-line bar (back, seal, name, language), then the
 * form in a slimmer palki, its button on the first screen. Web (lg): the name moves left with the pitch and the three promises under it, and the palki stands in
 * a column on the right. Before the site exists (the /setup screen) the pitch speaks to the ghotok instead of to
 * families.
 */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const [site, { t }] = await Promise.all([currentSite(), getT()]);
  const features = site ? FAMILY_FEATURES : SETUP_FEATURES;
  return (
    <div className="flex min-h-dvh flex-col">
      {/* phone: one line (back to the front page, seal, name, language), so the form starts near the top; web: the language alone */}
      <header className="flex items-center gap-2.5 px-4 pt-3 lg:justify-end lg:px-12 lg:pt-6">
        {site ? (
          <Link href="/" aria-label={t("common.back")} className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink lg:hidden"><Icon name="back" size={18} /></Link>
        ) : null}
        <Logo className="size-8 shrink-0 rounded-xl outline-2 outline-offset-3 outline-primary outline-dotted lg:hidden" />
        <span className="flex min-w-0 flex-1 flex-col leading-tight lg:hidden">
          <span className="truncate font-display text-base font-extrabold">{site?.name ?? t("common.brand")}</span>
          <span className="truncate text-[11px] font-medium text-muted">{site ? t("auth.forFamilies") : t("auth.ghotokSite")}</span>
        </span>
        <LangSwitch />
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-6 px-4 pt-3 pb-10 lg:grid-cols-[minmax(0,1fr)_30rem] lg:gap-20 lg:px-12 lg:pb-16">
        <div className="hidden flex-col gap-1 lg:flex">
          <p className="font-script text-5xl/tight text-balance text-primary">{site?.name ?? t("common.brand")}</p>
          <p className="text-base text-muted">{site ? (site.tagline ?? t("site.defaultTagline")) : t("auth.ghotokSite")}</p>
          <p className="mt-8 max-w-xl font-serif text-5xl/tight text-balance">{site ? t("auth.familyHeadline") : t("auth.setupHeadline")}</p>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">{site ? t("auth.familyPitch") : t("auth.setupPitch")}</p>
          <ul className="mt-8 flex flex-col gap-4">
            {features.map((f) => (
              <li key={f.text} className="flex items-center gap-4 text-lg">
                <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={f.icon} size={20} /></span>
                {t(f.text)}
              </li>
            ))}
          </ul>
        </div>
        <main className="flex w-full flex-col gap-4 lg:gap-6">
          {children}
          <p className="flex items-center justify-center gap-2 text-sm text-muted"><Icon name="lock" size={16} />{t("auth.safe")}</p>
        </main>
      </div>
    </div>
  );
}
