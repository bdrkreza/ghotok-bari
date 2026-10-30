import type { Metadata } from "next";
import Link from "next/link";
import { NewProposalForm } from "@/components/proposal-forms";
import { Empty, PageHeader, primaryButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { bn } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { activeProfiles } from "@/lib/services/profiles";
import { ageFromYear } from "@/lib/time";

export const metadata: Metadata = { title: "নতুন প্রস্তাব" };

export default async function NewProposalPage(props: PageProps<"/proposals/new">) {
  const user = await requireAdmin();
  const query = await props.searchParams;
  const db = getDb();
  const [patros, patris] = await Promise.all([activeProfiles(db, user.ghotokId, "patro"), activeProfiles(db, user.ghotokId, "patri")]);
  const label = (p: { name: string; district: string; birthYear: number }) => `${p.name} · ${bn(ageFromYear(p.birthYear))} বছর · ${p.district}`;
  const pick = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  return (
    <>
      <PageHeader title="নতুন প্রস্তাব" back="/proposals" sub="একজন পাত্রের জন্য একজন পাত্রী বেছে নিন" />
      <div className="lg:max-w-2xl">
        {patros.length && patris.length ? (
          <NewProposalForm
            patros={patros.map((p) => [p.id, label(p)] as const)}
            patris={patris.map((p) => [p.id, label(p)] as const)}
            patroId={pick(query.patro)} patriId={pick(query.patri)} />
        ) : (
          <Empty action={<Link href={`/profiles/new?kind=${patros.length ? "patri" : "patro"}`} className={primaryButton}>{patros.length ? "পাত্রী" : "পাত্র"} যোগ করুন</Link>}>
            প্রস্তাব দিতে অন্তত একজন পাত্র ও একজন পাত্রী খোঁজ চলছে অবস্থায় থাকতে হবে।
          </Empty>
        )}
      </div>
    </>
  );
}
