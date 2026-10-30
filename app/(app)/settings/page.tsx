import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { InstallCard } from "@/components/pwa";
import { ThemeCard } from "@/components/theme";
import { Card, Facts, PageHeader, quietButton } from "@/components/ui";
import { logoutAction } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/session";
import { bn } from "@/lib/bn";

export const metadata: Metadata = { title: "সেটিংস" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="সেটিংস" back="/" />
      <div className="flex flex-col gap-5 lg:max-w-2xl">
        <Card title="আপনার account">
          <Facts items={[["নাম", user.name], ["মোবাইল", bn(user.phone)]]} />
          <form action={logoutAction}>
            <button type="submit" className={`${quietButton} w-full`}><Icon name="logout" size={18} />বের হয়ে যান</button>
          </form>
        </Card>
        <ThemeCard />
        {user.role === "admin" ? (
          <Card title="অ্যাডমিন">
            <p className="text-sm text-muted">আপনি অ্যাডমিন: সব ঘটকের সংখ্যা, টাকার মোট আর তালিকা দেখতে পারেন।</p>
            <Link href="/admin" className={quietButton}><Icon name="shield" size={18} />অ্যাডমিন ড্যাশবোর্ড</Link>
          </Card>
        ) : null}
        <InstallCard />
        <Card title="আলতা সম্পর্কে">
          <p className="text-sm text-muted">
            গ্রামের ঘটকের ডিজিটাল খাতা। পাত্র-পাত্রীর তথ্য, কোন প্রস্তাব কতদূর এগোলো, আর টাকার হিসাব এক জায়গায়।
            আপনার লেখা সব তথ্য শুধু আপনার account থেকেই দেখা যায়।
          </p>
        </Card>
      </div>
    </>
  );
}
