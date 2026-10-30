import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, homeFor, requireSite } from "@/lib/auth/session";
import { RegisterForm } from "../forms";
import { AuthCard, AuthHeading } from "../ui";

export const metadata: Metadata = { title: "রেজিস্টার" };

/** A family's account: everyone who signs up here is a customer. */
export default async function RegisterPage() {
  await requireSite();
  const user = await getSessionUser();
  if (user) redirect(homeFor(user.role));
  return (
    <>
      <AuthHeading title="অ্যাকাউন্ট খুলুন" sub="পাত্র-পাত্রী দেখতে আর নিজের বায়োডাটা দিতে" />
      <AuthCard>
        <RegisterForm />
      </AuthCard>
      <p className="text-center text-muted">
        আগে থেকেই অ্যাকাউন্ট আছে?{" "}
        <Link href="/login" className="font-bold text-primary">লগইন করুন</Link>
      </p>
    </>
  );
}
