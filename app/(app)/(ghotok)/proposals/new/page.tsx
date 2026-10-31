import type { Metadata } from "next";
import Link from "next/link";
import { NewProposalForm } from "@/components/proposal-forms";
import { Empty, PageHeader, primaryButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { activeProfiles } from "@/lib/services/profiles";
import { ageFromYear } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("pr.newTitle") };
}

export default async function NewProposalPage(props: PageProps<"/proposals/new">) {
  const [user, T] = await Promise.all([requireAdmin(), getT()]);
  const { t } = T;
  const query = await props.searchParams;
  const db = getDb();
  const [patros, patris] = await Promise.all([activeProfiles(db, user.ghotokId, "patro"), activeProfiles(db, user.ghotokId, "patri")]);
  const label = (p: { name: string; district: string; birthYear: number }) => `${p.name} · ${T.years(ageFromYear(p.birthYear))} · ${p.district}`;
  const pick = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const missing = patros.length ? "patri" : "patro";

  return (
    <>
      <PageHeader title={t("pr.newTitle")} back="/proposals" sub={t("pr.newSub")} />
      <div className="lg:max-w-2xl">
        {patros.length && patris.length ? (
          <NewProposalForm
            patros={patros.map((p) => [p.id, label(p)] as const)}
            patris={patris.map((p) => [p.id, label(p)] as const)}
            patroId={pick(query.patro)} patriId={pick(query.patri)} />
        ) : (
          <Empty action={<Link href={`/profiles/new?kind=${missing}`} className={primaryButton}>{t("form.addKind", { kind: t(`kind.${missing}`) })}</Link>}>
            {t("pr.needBoth")}
          </Empty>
        )}
      </div>
    </>
  );
}
