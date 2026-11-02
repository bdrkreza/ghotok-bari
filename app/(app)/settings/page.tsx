import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PasswordForm } from "./_components/password-form";
import { Icon } from "@/components/icons";
import { LangChoice } from "@/components/lang-switch";
import { InstallCard } from "@/components/pwa";
import { ContactButtons } from "@/components/site";
import { ThemeChoice } from "@/components/theme";
import { Badge, Card, PageHeader, quietButton, type Tone } from "@/components/ui";
import { logoutAction } from "@/lib/auth/actions";
import { homeFor, requireSite, requireUser } from "@/lib/auth/session";
import { initials } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { publicSite } from "@/lib/services/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("common.settings") };
}

/**
 * Settings for either role. Phone: one column, account first, then preferences, then the app and about cards.
 * Web: the same cards in two columns, the account and preferences on the left, the app and about on the right.
 */
export default async function SettingsPage() {
  const [user, site, T] = await Promise.all([requireUser(), requireSite(), getT()]);
  const { t } = T;
  const owner = user.id === site.ghotokId;
  // a family gets the ghotok's number here too, since this is where they come looking for help
  const pub = user.role === "customer" ? await publicSite(getDb()) : null;
  const role: { label: string; tone: Tone } =
    user.role !== "admin" ? { label: t("st.roleCustomer"), tone: "mint" }
    : owner ? { label: t("st.roleOwner"), tone: "lilac" }
    : { label: t("st.roleAdmin"), tone: "sky" };
  const hint = user.role === "customer" ? t("st.passwordHint") : owner ? t("st.ownerPhoneHint") : null;

  return (
    <>
      <PageHeader title={t("common.settings")} back={homeFor(user.role)} />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
        <div className="flex flex-col gap-5">
          <Card>
            <div className="flex items-center gap-4">
              <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-xl font-bold text-primary">{initials(user.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-muted">{t("st.signedIn")}</p>
                <p className="truncate font-display text-xl font-bold">{user.name}</p>
                {/* the role sits beside the number, so a long name keeps the whole width on a phone */}
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                  <span className="tabular-nums">{T.n(user.phone)}</span>
                  <Badge tone={role.tone}>{role.label}</Badge>
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-line pt-3 lg:flex-row lg:items-center lg:justify-between">
              {hint ? <p className="text-sm text-muted lg:max-w-md">{hint}</p> : <span />}
              <form action={logoutAction} className="flex lg:shrink-0">
                <button type="submit" className={`${quietButton} w-full lg:w-auto`}><Icon name="logout" size={18} />{t("st.logout")}</button>
              </form>
            </div>
          </Card>

          <Card title={t("st.passwordTitle")}>
            <p className="text-sm text-muted">{t("st.passwordText")}</p>
            <PasswordForm />
          </Card>

          <Card title={t("st.prefs")}>
            <Pref label={t("st.language")} text={t("st.languageText")}><LangChoice /></Pref>
            <hr className="border-line" />
            <Pref label={t("theme.aria")} text={t("theme.text")}><ThemeChoice /></Pref>
          </Card>

          {user.role === "admin" ? (
            <Card title={t("cu.title")}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="people" size={22} /></span>
                  <p className="text-sm text-muted">{t("st.customersText")}</p>
                </div>
                <Link href="/dashboard/customers" className={`${quietButton} lg:shrink-0`}>{t("st.customersLink")}<Icon name="chevronRight" size={18} /></Link>
              </div>
              <div className="grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
                <Link href="/dashboard/site" className={quietButton}><Icon name="edit" size={18} />{t("dash.siteCard")}</Link>
                <Link href="/dashboard/activity" className={quietButton}><Icon name="note" size={18} />{t("dash.activityCard")}</Link>
              </div>
            </Card>
          ) : null}

          {user.role === "admin" ? (
            <Card title={t("st.backupTitle")}>
              <p className="text-sm text-muted">{t("st.backupText")}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {/* plain links: the browser downloads the file the route sends */}
                <a href="/api/backup?format=csv" download className={quietButton}><Icon name="note" size={18} />{t("st.backupCsv")}</a>
                <a href="/api/backup?format=json" download className={quietButton}><Icon name="shield" size={18} />{t("st.backupJson")}</a>
              </div>
              <p className="text-xs text-muted">{t("st.backupHint")}</p>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          <InstallCard />
          <Card title={t("st.aboutTitle", { site: site.name })}>
            <p className="text-sm text-muted">{user.role === "admin" ? t("st.aboutAdmin") : t("st.aboutCustomer")}</p>
            {pub ? (
              <>
                <div className="flex items-center gap-3 border-t border-line pt-3">
                  <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-base font-bold text-primary">ঘ</span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{pub.ghotokName}</p>
                    <p className="truncate text-sm text-muted">{pub.address ?? pub.name}</p>
                  </div>
                </div>
                <ContactButtons phone={pub.phone} whatsapp={pub.whatsapp} t={T} />
              </>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}

/** One preference: its name and a line of help on the left (above, on a phone), the control on the right. */
function Pref({ label, text, children }: { label: string; text: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div>
        <p className="font-bold">{label}</p>
        <p className="text-sm text-muted">{text}</p>
      </div>
      {children}
    </div>
  );
}
