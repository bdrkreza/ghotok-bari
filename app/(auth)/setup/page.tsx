import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { quietButton } from "@/components/ui";
import { seedDemoAction } from "@/lib/actions/demo";
import { currentSite } from "@/lib/auth/session";
import { usingDevDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { SetupForm } from "../forms";
import { AuthCard, AuthHeading, Or } from "../ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("setup.title") };
}

/** Shown once, on a deployment that has no site yet. Afterwards the address goes to /login. */
export default async function SetupPage() {
  if (await currentSite()) redirect("/login");
  const { t } = await getT();
  const dev = process.env.NODE_ENV !== "production" && usingDevDb();
  return (
    <>
      <AuthHeading title={t("setup.title")} sub={t("setup.sub")} />
      <AuthCard>
        <p className="flex items-start gap-2 rounded-2xl bg-warn px-4 py-3 text-sm font-semibold text-warn-ink">
          <Icon name="shield" size={18} className="mt-0.5" />
          {t("setup.warning")}
        </p>
        <SetupForm />
        {dev ? (
          <>
            <Or label={t("auth.or")} />
            <form action={seedDemoAction}>
              <button type="submit" className={`${quietButton} w-full`}><Icon name="sparkle" size={18} />{t("auth.demoSetupButton")}</button>
            </form>
          </>
        ) : null}
      </AuthCard>
    </>
  );
}
