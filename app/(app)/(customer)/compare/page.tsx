import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { expectedAge, familyTags } from "@/components/biodata";
import { Card, PageHeader, primaryButton } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { browseOne } from "@/lib/services/biodata";
import { ageFromYear } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("cmp.title") };
}

/**
 * Two listed biodata side by side, as a family sees them (FAMILY_VIEW only): age, height, education, work, place and
 * the family, one row each, so a choice between two is read across instead of flipping between pages. Reached from the
 * short list on /me; an id that is not a listed biodata of this site is a 404.
 */
export default async function ComparePage(props: PageProps<"/compare">) {
  const [me, T] = await Promise.all([requireCustomer(), getT()]);
  const { t } = T;
  const { a, b } = await props.searchParams;
  if (typeof a !== "string" || typeof b !== "string" || a === b) notFound();
  const db = getDb();
  const [x, y] = await Promise.all([browseOne(db, me.ghotokId, a), browseOne(db, me.ghotokId, b)]);
  if (!x || !y) notFound();

  const rows: [string, string, string][] = [
    [t("facts.age"), T.years(ageFromYear(x.birthYear)), T.years(ageFromYear(y.birthYear))],
    [t("facts.height"), x.heightCm ? T.height(x.heightCm) : "", y.heightCm ? T.height(y.heightCm) : ""],
    [t("facts.religion"), t(`religion.${x.religion}`), t(`religion.${y.religion}`)],
    [t("facts.marital"), t(`marital.${x.maritalStatus}`), t(`marital.${y.maritalStatus}`)],
    [t("facts.education"), x.education ?? "", y.education ?? ""],
    [t("facts.profession"), x.profession ?? "", y.profession ?? ""],
    [t("facts.workplace"), x.workplace ?? "", y.workplace ?? ""],
    [t("form.district"), x.district, y.district],
    [t("form.upazila"), x.upazila ?? "", y.upazila ?? ""],
    [t("form.village"), x.village ?? "", y.village ?? ""],
    [t("facts.family"), familyTags(x, T).join(" · "), familyTags(y, T).join(" · ")],
    [t("cmp.expectAge"), expectedAge(x, T), expectedAge(y, T)],
  ];
  const cell = (v: string) => v || <span className="text-muted">{t("cmp.none")}</span>;

  return (
    <>
      <PageHeader title={t("cmp.title")} back="/me" sub={t("cmp.sub")} />
      <Card>
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-line text-left align-bottom">
              <th scope="col" className="w-1/4 pb-3"><span className="sr-only">{t("cmp.field")}</span></th>
              {[x, y].map((p, i) => (
                <th key={i} scope="col" className="pb-3 pl-2">
                  <Link href={`/biodata/${i ? b : a}`} className="font-display text-base font-bold text-primary">{T.biodataNo(p.kind, p.code)}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(([label, left, right]) => (
              <tr key={label} className="align-top">
                <th scope="row" className="py-2.5 pr-2 text-left text-xs font-semibold text-muted">{label}</th>
                <td className="py-2.5 pl-2 break-words">{cell(left)}</td>
                <td className="py-2.5 pl-2 break-words">{cell(right)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Link href={`/biodata/${a}`} className={primaryButton}>{T.biodataNo(x.kind, x.code)}</Link>
        <Link href={`/biodata/${b}`} className={primaryButton}>{T.biodataNo(y.kind, y.code)}</Link>
      </div>
    </>
  );
}
