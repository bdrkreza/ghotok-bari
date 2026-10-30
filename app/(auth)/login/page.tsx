import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { quietButton } from "@/components/ui";
import { seedDemoAction } from "@/lib/actions/demo";
import { getSessionUser, homeFor, requireSite } from "@/lib/auth/session";
import { usingDevDb } from "@/lib/db";
import { DEMO, DEMO_CUSTOMER } from "@/lib/demo";
import { LoginForm } from "../forms";
import { AuthCard, AuthHeading, Or } from "../ui";

export const metadata: Metadata = { title: "লগইন" };

export default async function LoginPage() {
  await requireSite();
  const user = await getSessionUser();
  if (user) redirect(homeFor(user.role));
  const dev = process.env.NODE_ENV !== "production" && usingDevDb();
  return (
    <>
      <AuthHeading title="আবার স্বাগতম" sub="আপনার অ্যাকাউন্টে লগইন করুন" />
      <AuthCard>
        <LoginForm />
        {dev ? (
          <>
            <Or />
            <form action={seedDemoAction}>
              <button type="submit" className={`${quietButton} w-full`}><Icon name="sparkle" size={18} />ডেমো ডেটা তৈরি করে ঢুকুন</button>
            </form>
            <p className="text-center text-sm text-muted">
              Development: ঘটক <span className="font-mono font-bold">{DEMO.phone}</span> / <span className="font-mono font-bold">{DEMO.password}</span>, গ্রাহক <span className="font-mono font-bold">{DEMO_CUSTOMER.phone}</span> / <span className="font-mono font-bold">{DEMO_CUSTOMER.password}</span>
            </p>
          </>
        ) : null}
      </AuthCard>
      <p className="text-center text-muted">
        অ্যাকাউন্ট নেই?{" "}
        <Link href="/register" className="font-bold text-primary">রেজিস্টার করুন</Link>
      </p>
      <p className="text-center text-sm text-muted">পাসওয়ার্ড ভুলে গেলে ঘটককে ফোন করুন; উনি নতুন পাসওয়ার্ড দিয়ে দেবেন।</p>
    </>
  );
}
