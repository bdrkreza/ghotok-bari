import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { DeleteBiodataForm } from "@/components/biodata-forms";
import { Icon } from "@/components/icons";
import { Badge, Card, Facts, PageHeader, quietButton } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { APPROVAL, MARITAL, RELIGION, biodataNo, bn, heightLabel, taka } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { orNotFound } from "@/lib/not-found";
import { getMyBiodata } from "@/lib/services/biodata";
import { ageFromYear, formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "আমার বায়োডাটা" };

/** One of the family's own biodata, in full, with where it stands with the ghotok. */
export default async function MyBiodataPage(props: PageProps<"/me/biodata/[id]">) {
  const me = await requireCustomer();
  const { id } = await props.params;
  const p = await orNotFound(getMyBiodata(getDb(), me.ghotokId, me.id, id));
  const a = APPROVAL[p.approval];

  return (
    <>
      <PageHeader title={p.name} back="/me" sub={`${biodataNo(p.kind, p.code)} · ${bn(ageFromYear(p.birthYear))} বছর`}
        action={<Link href={`/me/biodata/${p.id}/edit`} aria-label="সম্পাদনা" className="grid size-11 place-items-center rounded-2xl border border-line bg-surface"><Icon name="edit" /></Link>} />

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5 lg:col-span-3">
          <Card>
            <div className="flex items-start gap-4">
              <Avatar kind={p.kind} photoUrl={p.photoUrl} className="size-24 rounded-2xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Badge tone={a.tone}>{a.label}</Badge>
                <p className="flex items-center gap-1.5 text-sm text-muted"><Icon name="location" size={16} />{[p.village, p.upazila, p.district].filter(Boolean).join(", ")}</p>
                {p.guardianPhone ? <p className="flex items-center gap-1.5 text-sm text-muted"><Icon name="phone" size={16} />{bn(p.guardianPhone)}{p.guardianName ? ` · ${p.guardianName}` : ""}</p> : null}
              </div>
            </div>
            <Facts items={[
              ["বয়স", `${bn(ageFromYear(p.birthYear))} বছর (${bn(p.birthYear)})`],
              ["উচ্চতা", p.heightCm ? heightLabel(p.heightCm) : null],
              ["ধর্ম", RELIGION[p.religion]],
              ["বৈবাহিক অবস্থা", MARITAL[p.maritalStatus]],
              ["শিক্ষা", p.education],
              ["পেশা", p.profession],
              ["মাসিক আয়", p.monthlyIncome ? taka(p.monthlyIncome) : null],
              ["বাবা", p.fatherName],
              ["মা", p.motherName],
              ["অভিভাবক", p.guardianName],
            ]} />
            {p.familyDetails ? <Text label="পরিবার" value={p.familyDetails} /> : null}
            {p.expectations ? <Text label="যেমন চান" value={p.expectations} /> : null}
            <p className="text-xs text-muted">জমা {formatDate(p.createdAt)} · শেষ বদল {formatDate(p.updatedAt)}</p>
          </Card>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card title="ঘটকের কাছে">
            {p.approval === "pending" ? (
              <p className="text-sm text-muted">ঘটক এখনো দেখেননি। অনুমোদন দিলে তালিকায় উঠবে, ফেরত দিলে এখানে কারণ দেখা যাবে।</p>
            ) : p.approval === "returned" ? (
              <>
                <p className="text-sm text-muted">ঘটক কিছু বদলাতে বলেছেন:</p>
                <p className="rounded-2xl bg-neg-soft px-4 py-3 text-sm font-semibold text-neg">{p.returnNote ?? "কোনো কারণ লেখা নেই; ঘটককে ফোন করুন।"}</p>
                <Link href={`/me/biodata/${p.id}/edit`} className={quietButton}><Icon name="edit" size={18} />ঠিক করে আবার জমা দিন</Link>
              </>
            ) : (
              <p className="text-sm text-muted">তালিকায় আছে: অন্য পরিবার নাম-ছবি ছাড়া বায়োডাটা নম্বর দিয়ে দেখছে। কিছু বদলালে ঘটক আবার দেখে তবেই তালিকায় যাবে।</p>
            )}
          </Card>

          <Card title="কে কী দেখে">
            <p className="text-sm text-muted">
              অন্য পরিবার দেখে: বয়স, উচ্চতা, ধর্ম, বৈবাহিক অবস্থা, শিক্ষা, পেশা, উপজেলা-জেলা, পরিবার আর প্রত্যাশা।
              নাম, ছবি, বাবা-মা, অভিভাবকের নম্বর, গ্রাম আর আয় শুধু ঘটক দেখেন।
            </p>
          </Card>

          {p.approval !== "approved" ? (
            <details className="rounded-2xl border border-line bg-surface p-4">
              <summary className="cursor-pointer font-semibold text-neg">মুছে ফেলুন</summary>
              <div className="pt-4"><DeleteBiodataForm id={p.id} /></div>
            </details>
          ) : (
            <p className="text-xs text-muted">তালিকায় থাকা বায়োডাটা সরাতে ঘটককে ফোন করুন।</p>
          )}
        </div>
      </div>
    </>
  );
}

function Text({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="whitespace-pre-line">{value}</p>
    </div>
  );
}
