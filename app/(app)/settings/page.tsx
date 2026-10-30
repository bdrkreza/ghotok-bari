import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { InstallCard } from "@/components/pwa";
import { ThemeCard } from "@/components/theme";
import { Card, Facts, PageHeader, quietButton } from "@/components/ui";
import { logoutAction } from "@/lib/auth/actions";
import { homeFor, requireSite, requireUser } from "@/lib/auth/session";
import { bn } from "@/lib/bn";

export const metadata: Metadata = { title: "সেটিংস" };

export default async function SettingsPage() {
  const [user, site] = await Promise.all([requireUser(), requireSite()]);
  const owner = user.id === site.ghotokId;
  return (
    <>
      <PageHeader title="সেটিংস" back={homeFor(user.role)} />
      <div className="flex flex-col gap-5 lg:max-w-2xl">
        <Card title="আপনার account">
          <Facts items={[["নাম", user.name], ["মোবাইল", bn(user.phone)], ["ভূমিকা", user.role === "admin" ? (owner ? "ঘটক (সাইটের মালিক)" : "অ্যাডমিন") : "গ্রাহক"]]} />
          <form action={logoutAction}>
            <button type="submit" className={`${quietButton} w-full`}><Icon name="logout" size={18} />বের হয়ে যান</button>
          </form>
        </Card>
        <ThemeCard />
        {user.role === "admin" ? (
          <Card title="গ্রাহক ও অ্যাডমিন">
            <p className="text-sm text-muted">সাইটে যারা অ্যাকাউন্ট খুলেছেন তাদের তালিকা; কাউকে সহকারী অ্যাডমিন করা বা সরানো যায়।</p>
            <Link href="/dashboard/customers" className={quietButton}><Icon name="people" size={18} />তালিকা দেখুন</Link>
          </Card>
        ) : null}
        <InstallCard />
        <Card title={`${site.name} সম্পর্কে`}>
          <p className="text-sm text-muted">
            {user.role === "admin"
              ? "আপনার ঘটকালির ওয়েবসাইট: পরিবাররা বায়োডাটা দেখে ও দেয়, আর পাত্র-পাত্রীর তথ্য, প্রস্তাব ও টাকার হিসাব আপনার ড্যাশবোর্ডে থাকে।"
              : "ঘটকের নিজের ওয়েবসাইট। আপনার দেওয়া তথ্য শুধু ঘটক দেখেন; নাম, ছবি ও যোগাযোগ অন্য কোনো পরিবারকে দেখানো হয় না।"}
          </p>
        </Card>
      </div>
    </>
  );
}
