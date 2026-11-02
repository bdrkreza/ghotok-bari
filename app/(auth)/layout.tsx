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
 * The sign-in shell, on the ivory ground of a white saree. Phone: the language switch, the site's name, then the form
 * in its palki. Web (lg): the name moves left with the pitch and the three promises under it, and the palki stands in
 * a column on the right. Before the site exists (the /setup screen) the pitch speaks to the ghotok instead of to
 * families.
 */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const [site, { t }] = await Promise.all([currentSite(), getT()]);
  const features = site ? FAMILY_FEATURES : SETUP_FEATURES;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex justify-end px-4 pt-4 lg:px-12 lg:pt-6">
        <LangSwitch />
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-6 px-4 pt-2 pb-10 lg:grid-cols-[minmax(0,1fr)_30rem] lg:gap-20 lg:px-12 lg:pb-16">
        <div className="flex flex-col items-center gap-1 text-center lg:items-start lg:text-left">
          <p className="font-script text-4xl/tight text-balance text-primary lg:text-5xl/tight">{site?.name ?? t("common.alta")}</p>
          <p className="text-sm text-muted lg:text-base">{site ? (site.tagline ?? t("site.defaultTagline")) : t("auth.ghotokSite")}</p>
          <p className="mt-8 hidden max-w-xl font-serif text-5xl/tight text-balance lg:block">{site ? t("auth.familyHeadline") : t("auth.setupHeadline")}</p>
          <p className="mt-4 hidden max-w-md text-lg leading-relaxed text-muted lg:block">{site ? t("auth.familyPitch") : t("auth.setupPitch")}</p>
          <ul className="mt-8 hidden flex-col gap-4 lg:flex">
            {features.map((f) => (
              <li key={f.text} className="flex items-center gap-4 text-lg">
                <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={f.icon} size={20} /></span>
                {t(f.text)}
              </li>
            ))}
          </ul>
        </div>
        <main className="flex w-full flex-col gap-6">
          {children}
          <p className="flex items-center justify-center gap-2 text-sm text-muted"><Icon name="lock" size={16} />{t("auth.safe")}</p>
        </main>
      </div>
    </div>
  );
}
