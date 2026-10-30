import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FamilyBiodata } from "@/components/biodata";
import { Icon } from "@/components/icons";
import { bn } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { publicBiodata } from "@/lib/services/share";
import { currentSite } from "@/lib/auth/session";

export const metadata: Metadata = { title: "বায়োডাটা", robots: { index: false, follow: false } };

/**
 * The public, read-only biodata a family opens from a link the ghotok sent. No sign-in: the token in the URL is
 * the key, and lib/services/share.ts decides what is shown. Public in proxy.ts.
 */
export default async function PublicBiodataPage(props: PageProps<"/b/[token]">) {
  const { token } = await props.params;
  const [b, site] = await Promise.all([publicBiodata(getDb(), token), currentSite()]);
  if (!b) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4 lg:h-16">
          <span className="flex min-w-0 items-center gap-2 font-display text-lg font-extrabold">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-base text-on-primary">ঘ</span>
            <span className="truncate">{site?.name ?? "আলতা"}</span>
          </span>
          <span className="shrink-0 text-sm text-muted">ঘটকের শেয়ার করা বায়োডাটা</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 lg:py-10">
        <FamilyBiodata b={b} aside={
          <section className="flex flex-col gap-3 rounded-3xl border border-primary-soft bg-primary-soft/40 p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-bold"><Icon name="phone" size={18} className="text-primary" />আগ্রহী হলে ঘটকের সাথে কথা বলুন</h2>
            <p className="text-sm text-muted">নাম, ছবি আর পরিবারের যোগাযোগ ঘটকের মাধ্যমে, দুই পক্ষের সম্মতিতে জানানো হয়।</p>
            <p className="font-bold">{b.ghotok.name}</p>
            <a href={`tel:${b.ghotok.phone}`} className="inline-flex min-h-12 w-fit items-center gap-2 rounded-2xl bg-primary px-5 font-bold text-on-primary">
              <Icon name="phone" size={18} />{bn(b.ghotok.phone)}
            </a>
          </section>
        } />
      </main>

      <footer className="px-4 py-6 text-center text-xs text-muted">{site?.name ?? "আলতা"} · আলতা দিয়ে তৈরি</footer>
    </div>
  );
}
