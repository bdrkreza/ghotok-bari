import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { quietButton } from "@/components/ui";
import { seedDemoAction } from "@/lib/actions/demo";
import { getSessionUser, homeFor, requireSite } from "@/lib/auth/session";
import { usingDevDb } from "@/lib/db";
import { DEMO, DEMO_CUSTOMER } from "@/lib/demo";
import { getT } from "@/lib/i18n/server";
import { LoginForm } from "../forms";
import { AuthCard, AuthHeading, Or } from "../ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("front.login") };
}

export default async function LoginPage() {
  await requireSite();
  const [user, { t }] = await Promise.all([getSessionUser(), getT()]);
  if (user) redirect(homeFor(user.role));
  const dev = process.env.NODE_ENV !== "production" && usingDevDb();
  const mono = (s: string) => <span className="font-mono font-bold">{s}</span>;
  return (
    <>
      <AuthCard>
        <AuthHeading title={t("auth.welcomeBack")} sub={t("auth.loginSub")} />
        <LoginForm />
        {dev ? (
          <>
            <Or label={t("auth.or")} />
            <form action={seedDemoAction}>
              <button type="submit" className={`${quietButton} w-full`}><Icon name="sparkle" size={18} />{t("auth.demoButton")}</button>
            </form>
            <p className="text-center text-sm text-muted">
              {t("auth.devGhotok")} {mono(DEMO.phone)} / {mono(DEMO.password)}, {t("auth.devCustomer")} {mono(DEMO_CUSTOMER.phone)} / {mono(DEMO_CUSTOMER.password)}
            </p>
          </>
        ) : null}
      </AuthCard>
      <p className="text-center text-muted">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-bold text-primary">{t("auth.register")}</Link>
      </p>
      <p className="text-center text-sm text-muted">{t("auth.forgot")}</p>
    </>
  );
}
