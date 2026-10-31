import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { LangSwitch } from "@/components/lang-switch";
import { InstallCard } from "@/components/pwa";
import { ThemeCard } from "@/components/theme";
import { Card, Facts, PageHeader, quietButton } from "@/components/ui";
import { logoutAction } from "@/lib/auth/actions";
import { homeFor, requireSite, requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("common.settings") };
}

export default async function SettingsPage() {
  const [user, site, T] = await Promise.all([requireUser(), requireSite(), getT()]);
  const { t } = T;
  const owner = user.id === site.ghotokId;
  return (
    <>
      <PageHeader title={t("common.settings")} back={homeFor(user.role)} />
      <div className="flex flex-col gap-5 lg:max-w-2xl">
        <Card title={t("st.account")}>
          <Facts items={[[t("st.name"), user.name], [t("st.phone"), T.n(user.phone)], [t("st.role"), user.role === "admin" ? (owner ? t("st.roleOwner") : t("st.roleAdmin")) : t("st.roleCustomer")]]} />
          <form action={logoutAction}>
            <button type="submit" className={`${quietButton} w-full`}><Icon name="logout" size={18} />{t("st.logout")}</button>
          </form>
        </Card>
        <Card title={t("st.language")}>
          <p className="text-sm text-muted">{t("st.languageText")}</p>
          <LangSwitch className="self-start" />
        </Card>
        <ThemeCard />
        {user.role === "admin" ? (
          <Card title={t("cu.title")}>
            <p className="text-sm text-muted">{t("st.customersText")}</p>
            <Link href="/dashboard/customers" className={quietButton}><Icon name="people" size={18} />{t("st.customersLink")}</Link>
          </Card>
        ) : null}
        <InstallCard />
        <Card title={t("st.aboutTitle", { site: site.name })}>
          <p className="text-sm text-muted">{user.role === "admin" ? t("st.aboutAdmin") : t("st.aboutCustomer")}</p>
        </Card>
      </div>
    </>
  );
}
