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
 * The sign-in shell. Phone: a slim coloured brand bar, then the form in one column. Web (lg): the bar grows into a
 * full-height panel down the left with the site's pitch, and the form sits centred beside it. Before the site exists
 * (the /setup screen) the panel speaks to the ghotok instead of to families.
 */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const [site, { t }] = await Promise.all([currentSite(), getT()]);
  const features = site ? FAMILY_FEATURES : SETUP_FEATURES;
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="henna-sides bg-panel px-4 py-4 text-on-panel lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-104 lg:shrink-0 lg:flex-col lg:justify-between lg:px-12 lg:py-12 xl:w-120 2xl:w-xl 2xl:px-14">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 lg:mx-0 lg:max-w-none">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-on-panel font-display text-xl font-extrabold text-panel outline-2 outline-offset-3 outline-on-panel outline-dotted lg:size-14 lg:text-2xl">ঘ</span>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate font-display text-2xl leading-tight font-bold lg:text-3xl">{site?.name ?? t("common.alta")}</p>
            <p className="truncate text-sm text-on-panel/80">{site ? (site.tagline ?? t("site.defaultTagline")) : t("auth.ghotokSite")}</p>
          </div>
          <LangSwitch tone="panel" className="shrink-0" />
        </div>
        <div className="hidden flex-col items-start gap-5 lg:flex">
          <span className="rounded-full bg-panel-soft px-3.5 py-1 text-sm font-bold text-panel">{site ? t("auth.forFamilies") : t("auth.firstTime")}</span>
          <p className="max-w-md font-display text-4xl/tight font-extrabold text-balance xl:text-5xl/tight">
            {site ? t("auth.familyHeadline") : t("auth.setupHeadline")}
          </p>
          <p className="max-w-sm text-lg leading-relaxed text-on-panel/85">{site ? t("auth.familyPitch") : t("auth.setupPitch")}</p>
        </div>
        <ul className="hidden flex-col gap-4 lg:flex">
          {features.map((f) => (
            <li key={f.text} className="flex items-center gap-4 text-lg">
              <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-on-panel/10"><Icon name={f.icon} size={22} /></span>
              {t(f.text)}
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 lg:px-12 lg:py-16">
        <div className="flex w-full max-w-md flex-col gap-6 lg:max-w-xl">
          {children}
          <p className="flex items-center justify-center gap-2 text-sm text-muted"><Icon name="lock" size={16} />{t("auth.safe")}</p>
        </div>
      </main>
    </div>
  );
}
