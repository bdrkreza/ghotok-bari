import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { DeleteBiodataForm } from "@/components/biodata-forms";
import { Icon } from "@/components/icons";
import { ApprovalBadge, Card, Facts, PageHeader, quietButton } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { orNotFound } from "@/lib/not-found";
import { getMyBiodata } from "@/lib/services/biodata";
import { ageFromYear } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("mb.title") };
}

/** One of the family's own biodata, in full, with where it stands with the ghotok. */
export default async function MyBiodataPage(props: PageProps<"/me/biodata/[id]">) {
  const [me, T] = await Promise.all([requireCustomer(), getT()]);
  const { t } = T;
  const { id } = await props.params;
  const p = await orNotFound(getMyBiodata(getDb(), me.ghotokId, me.id, id));

  return (
    <>
      <PageHeader title={p.name} back="/me" sub={`${T.biodataNo(p.kind, p.code)} · ${T.years(ageFromYear(p.birthYear))}`}
        action={<Link href={`/me/biodata/${p.id}/edit`} aria-label={t("common.editAria")} className="grid size-11 place-items-center rounded-2xl border border-line bg-surface"><Icon name="edit" /></Link>} />

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5 lg:col-span-3">
          <Card>
            <div className="flex items-start gap-4">
              <Avatar kind={p.kind} photoUrl={p.photoUrl} className="size-24 rounded-2xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <ApprovalBadge approval={p.approval} />
                <p className="flex items-center gap-1.5 text-sm text-muted"><Icon name="location" size={16} />{[p.village, p.upazila, p.district].filter(Boolean).join(", ")}</p>
                {p.guardianPhone ? <p className="flex items-center gap-1.5 text-sm text-muted"><Icon name="phone" size={16} />{T.n(p.guardianPhone)}{p.guardianName ? ` · ${p.guardianName}` : ""}</p> : null}
              </div>
            </div>
            <Facts items={[
              [t("facts.age"), t("facts.ageWithYear", { n: ageFromYear(p.birthYear), year: p.birthYear })],
              [t("facts.height"), p.heightCm ? T.height(p.heightCm) : null],
              [t("facts.religion"), t(`religion.${p.religion}`)],
              [t("facts.marital"), t(`marital.${p.maritalStatus}`)],
              [t("facts.education"), p.education],
              [t("facts.profession"), p.profession],
              [t("facts.income"), p.monthlyIncome ? T.money(p.monthlyIncome) : null],
              [t("facts.father"), p.fatherName],
              [t("facts.mother"), p.motherName],
              [t("facts.guardian"), p.guardianName],
            ]} />
            {p.familyDetails ? <Text label={t("facts.family")} value={p.familyDetails} /> : null}
            {p.expectations ? <Text label={t("facts.expectations")} value={p.expectations} /> : null}
            <p className="text-xs text-muted">{t("mb.submittedChanged", { a: T.date(p.createdAt), b: T.date(p.updatedAt) })}</p>
          </Card>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card title={t("mb.withGhotok")}>
            {p.approval === "pending" ? (
              <p className="text-sm text-muted">{t("mb.pendingText")}</p>
            ) : p.approval === "returned" ? (
              <>
                <p className="text-sm text-muted">{t("mb.returnedText")}</p>
                <p className="rounded-2xl bg-neg-soft px-4 py-3 text-sm font-semibold text-neg">{p.returnNote ?? t("mb.noReason")}</p>
                <Link href={`/me/biodata/${p.id}/edit`} className={quietButton}><Icon name="edit" size={18} />{t("mb.fixResubmit")}</Link>
              </>
            ) : (
              <p className="text-sm text-muted">{t("mb.listedText")}</p>
            )}
          </Card>

          <Card title={t("mb.whoSees")}>
            <p className="text-sm text-muted">{t("mb.whoSeesText")}</p>
          </Card>

          {p.approval !== "approved" ? (
            <details className="rounded-2xl border border-line bg-surface p-4">
              <summary className="cursor-pointer font-semibold text-neg">{t("common.delete")}</summary>
              <div className="pt-4"><DeleteBiodataForm id={p.id} /></div>
            </details>
          ) : (
            <p className="text-xs text-muted">{t("mb.askGhotok")}</p>
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
