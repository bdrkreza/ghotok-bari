import type { Metadata } from "next";
import Link from "next/link";
import { FamilyBiodata } from "@/components/biodata";
import { DeleteBiodataForm } from "@/components/biodata-forms";
import { Icon } from "@/components/icons";
import { ApprovalBadge, Card, PageHeader, quietButton } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { orNotFound } from "@/lib/not-found";
import { getMyBiodata } from "@/lib/services/biodata";
import { listPhotos } from "@/lib/services/photos";
import { myBiodataStats } from "@/lib/services/views";
import { ageFromYear } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("mb.title") };
}

/**
 * One of the family's own biodata, in full, laid out like the biodata other families see (the private rows marked
 * with a lock), with where it stands with the ghotok on the profile card.
 */
export default async function MyBiodataPage(props: PageProps<"/me/biodata/[id]">) {
  const [me, T] = await Promise.all([requireCustomer(), getT()]);
  const { t } = T;
  const { id } = await props.params;
  const p = await orNotFound(getMyBiodata(getDb(), me.ghotokId, me.id, id));
  const photos = await listPhotos(getDb(), me.ghotokId, p.id);
  // numbers only: how often other families opened it, how many keep it on their short list or asked about it
  const stats = p.approval === "approved" ? await myBiodataStats(getDb(), me.ghotokId, me.id, p.id) : null;

  return (
    <>
      <PageHeader title={p.name} back="/me" sub={`${T.biodataNo(p.kind, p.code)} · ${T.years(ageFromYear(p.birthYear))}`}
        action={<Link href={`/me/biodata/${p.id}/edit`} aria-label={t("common.editAria")} className="grid size-11 place-items-center rounded-2xl border border-line bg-surface"><Icon name="edit" /></Link>} />

      <FamilyBiodata
        b={p} t={T}
        // the ghotok's notes are never the family's to read
        full={{ ...p, notes: null, photos }}
        badges={
          <>
            <div className="flex flex-wrap items-center gap-1.5"><ApprovalBadge approval={p.approval} /></div>
            <p className="text-xs text-muted">{t("mb.submittedChanged", { a: T.date(p.createdAt), b: T.date(p.updatedAt) })}</p>
          </>
        }
        aside={
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <p className="text-sm font-bold">{t("mb.withGhotok")}</p>
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
          </div>
        }
        more={
          <>
            {stats ? (
              <Card title={t("mb.statsTitle")}>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  {([["views", stats.views, "mb.statViews"], ["favorites", stats.favorites, "mb.statFavorites"], ["interests", stats.interests, "mb.statInterests"]] as const).map(([k, n, label]) => (
                    <div key={k} className="rounded-2xl bg-primary-soft px-2 py-3">
                      <dd className="font-display text-2xl font-extrabold text-primary">{T.n(n)}</dd>
                      <dt className="text-xs text-muted">{t(label)}</dt>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-muted">{t("mb.statsNote", { n: stats.viewsWeek, f: stats.families })}</p>
              </Card>
            ) : null}
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
          </>
        }
      />
    </>
  );
}
