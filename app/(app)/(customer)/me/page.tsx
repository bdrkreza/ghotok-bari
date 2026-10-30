import type { Metadata } from "next";
import { ContactButtons, HowItWorks } from "@/components/site";
import { Card, Empty } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { bn } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { publicSite } from "@/lib/services/site";

export const metadata: Metadata = { title: "আমার পাতা" };

/** The family's own page: their biodata (the next step adds writing one), how the site works, and how to reach the ghotok. */
export default async function MePage() {
  const user = await requireCustomer();
  const site = await publicSite(getDb());

  return (
    <>
      <section className="flex flex-col gap-4 rounded-3xl border border-primary-soft bg-linear-to-br from-primary-soft/60 via-bg to-surface p-5 lg:p-8">
        <span className="self-start rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">{site?.name}</span>
        <h1 className="font-display text-3xl/[1.2] font-extrabold lg:text-4xl/[1.2]">
          আসসালামু আলাইকুম,<br /><span className="text-primary">{user.name}</span>
        </h1>
        <p className="text-muted lg:text-lg">
          এখন {bn(site?.patro ?? 0)} জন পাত্র ও {bn(site?.patri ?? 0)} জন পাত্রীর খোঁজ চলছে। আপনার বায়োডাটা দিলে ঘটক মিলিয়ে দেখবেন।
        </p>
      </section>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <section className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-primary">আমার বায়োডাটা</p>
            <h2 className="font-display text-xl font-bold lg:text-2xl">আপনার দেওয়া বায়োডাটা</h2>
          </div>
          <Empty>এখনো কোনো বায়োডাটা দেওয়া হয়নি।</Empty>
          <HowItWorks />
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-primary">ঘটক</p>
            <h2 className="font-display text-xl font-bold lg:text-2xl">যোগাযোগ</h2>
          </div>
          {site ? (
            <Card>
              <div className="flex items-center gap-3">
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary">ঘ</span>
                <div className="min-w-0">
                  <p className="truncate font-bold">{site.ghotokName}</p>
                  <p className="truncate text-sm text-muted">{site.address ?? site.name}</p>
                </div>
              </div>
              <p className="text-sm text-muted">কোনো বায়োডাটা নিয়ে কথা বলতে, বা নিজের বায়োডাটা দিতে সাহায্য লাগলে সরাসরি ফোন করুন।</p>
              <ContactButtons phone={site.phone} whatsapp={site.whatsapp} />
            </Card>
          ) : null}
        </section>
      </div>
    </>
  );
}
