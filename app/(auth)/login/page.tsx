import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { quietButton } from "@/components/ui";
import { seedDemoAction } from "@/lib/actions/demo";
import { getSessionUser } from "@/lib/auth/session";
import { usingDevDb } from "@/lib/db";
import { DEMO } from "@/lib/demo";
import { LoginForm } from "../forms";
import { AuthCard, AuthHeading, Or } from "../ui";

export const metadata: Metadata = { title: "লগইন" };

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getSessionUser()) redirect("/");
  const query = await props.searchParams;
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
              Development: ডেমো অ্যাকাউন্ট <span className="font-mono font-bold">{DEMO.phone}</span> / <span className="font-mono font-bold">{DEMO.password}</span>
              {query.demo === "exists" ? " আগেই তৈরি আছে, উপরে লগইন করুন।" : null}
            </p>
          </>
        ) : null}
      </AuthCard>
      <p className="text-center text-muted">
        অ্যাকাউন্ট নেই?{" "}
        <Link href="/register" className="font-bold text-primary">রেজিস্টার করুন</Link>
      </p>
    </>
  );
}
