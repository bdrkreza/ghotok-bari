import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { RegisterForm } from "../forms";
import { AuthCard, AuthHeading } from "../ui";

export const metadata: Metadata = { title: "রেজিস্টার" };

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/");
  return (
    <>
      <AuthHeading title="নতুন খাতা খুলুন" sub="আপনার পাত্র-পাত্রী আর হিসাব শুধু আপনিই দেখবেন" />
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
