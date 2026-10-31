import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, homeFor, requireSite } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { RegisterForm } from "../forms";
import { AuthCard, AuthHeading } from "../ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("front.register") };
}

/** A family's account: everyone who signs up here is a customer. */
export default async function RegisterPage() {
  await requireSite();
  const [user, { t }] = await Promise.all([getSessionUser(), getT()]);
  if (user) redirect(homeFor(user.role));
  return (
    <>
      <AuthHeading title={t("auth.registerTitle")} sub={t("auth.registerSub")} />
      <AuthCard>
        <RegisterForm />
      </AuthCard>
      <p className="text-center text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-bold text-primary">{t("auth.login")}</Link>
      </p>
    </>
  );
}
