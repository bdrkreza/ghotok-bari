import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { quietButton } from "@/components/ui";
import { seedDemoAction } from "@/lib/actions/demo";
import { currentSite } from "@/lib/auth/session";
import { usingDevDb } from "@/lib/db";
import { SetupForm } from "../forms";
import { AuthCard, AuthHeading, Or } from "../ui";

export const metadata: Metadata = { title: "সাইট চালু করুন" };

/** Shown once, on a deployment that has no site yet. Afterwards the address goes to /login. */
export default async function SetupPage() {
  if (await currentSite()) redirect("/login");
  const dev = process.env.NODE_ENV !== "production" && usingDevDb();
  return (
    <>
      <AuthHeading title="সাইট চালু করুন" sub="ঘটকের তথ্য দিন; অ্যাকাউন্ট, ড্যাশবোর্ড আর প্রথম পাতা একসাথে তৈরি হবে" />
      <AuthCard>
        <p className="flex items-start gap-2 rounded-2xl bg-warn px-4 py-3 text-sm font-semibold text-warn-ink">
          <Icon name="shield" size={18} className="mt-0.5" />
          এই পাতা একবারই আসে। যে নম্বর দেবেন সেটিই সাইটের মালিক ঘটক হবে, তাই এখনই নিজের তথ্য দিন।
        </p>
        <SetupForm />
        {dev ? (
          <>
            <Or />
            <form action={seedDemoAction}>
              <button type="submit" className={`${quietButton} w-full`}><Icon name="sparkle" size={18} />ডেমো সাইট ও ডেটা তৈরি করে ঢুকুন</button>
            </form>
          </>
        ) : null}
      </AuthCard>
    </>
  );
}
