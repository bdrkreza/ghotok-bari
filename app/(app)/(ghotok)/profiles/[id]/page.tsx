import Link from "next/link";
import { FamilyBiodata } from "@/components/biodata";
import { ApprovalForm, ShowParentsForm } from "@/components/biodata-forms";
import { Icon } from "@/components/icons";
import { DeleteProfileForm, ProfileStatusForm } from "@/components/proposal-forms";
import { ShareCard } from "./_components/share";
import { ApprovalBadge, Badge, Card, Empty, PageHeader, ProfileBadge, ProposalBadge, RowLink, primaryButton, quietButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { orNotFound } from "@/lib/not-found";
import { siteOrigin } from "@/lib/origin";
import { suggestFor } from "@/lib/services/match";
import { getProfile, profileOwner } from "@/lib/services/profiles";
import { proposalsFor } from "@/lib/services/proposals";
import { getShare } from "@/lib/services/share";
import { listPhotos } from "@/lib/services/photos";
import { ageFromYear } from "@/lib/time";

export default async function ProfilePage(props: PageProps<"/profiles/[id]">) {
  const [user, T] = await Promise.all([requireAdmin(), getT()]);
  const { t } = T;
  const { id } = await props.params;
  const db = getDb();
  const p = await orNotFound(getProfile(db, user.ghotokId, id));
  const listed = p.approval === "approved";
  const [proposals, suggestions, share, owner, origin, photos] = await Promise.all([
    proposalsFor(db, user.ghotokId, p.id),
    listed && p.status === "active" ? suggestFor(db, user.ghotokId, p) : Promise.resolve([]),
    getShare(db, user.ghotokId, p.id),
    profileOwner(db, user.ghotokId, p),
    siteOrigin(),
    listPhotos(db, user.ghotokId, p.id),
  ]);
  const other = p.kind === "patro" ? "patri" : "patro";
  const pairHref = (otherId: string) => `/proposals/new?${p.kind}=${p.id}&${other}=${otherId}`;
  const back = owner && !listed ? "/dashboard/approvals" : `/${p.kind}`;
  const no = T.biodataNo(p.kind, p.code);

  return (
    <>
      <PageHeader title={p.name} back={back} sub={`${no} · ${T.years(ageFromYear(p.birthYear))}`}
        action={<Link href={`/profiles/${p.id}/edit`} aria-label={t("common.editAria")} className="grid size-11 place-items-center rounded-2xl border border-line bg-surface"><Icon name="edit" /></Link>} />

      {/* A biodata a family handed in: who wrote it, and the decision buttons. First on the page, since that is what the ghotok came for. */}
      {owner ? (
        <Card title={listed ? t("pp.ownerListed") : t("pp.ownerPending")} className={listed ? "" : "border-warn-line bg-warn"}>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <ApprovalBadge approval={p.approval} />
            <span className="text-muted">{t("pp.givenBy")} <span className="font-bold text-ink">{owner.name}</span> · <a href={`tel:${owner.phone}`} className="font-bold text-primary">{T.n(owner.phone)}</a> · {T.date(p.updatedAt)}</span>
          </p>
          {p.approval === "returned" && p.returnNote ? <p className="text-sm text-muted">{t("pp.yourNote", { note: p.returnNote })}</p> : null}
          {listed ? null : <p className="text-sm text-muted">{t("pp.listHint")}</p>}
          <ApprovalForm id={p.id} current={p.approval} />
        </Card>
      ) : null}

      {/*
        The biodata laid out like the one families see, with everything private marked by a lock. On a phone, in this
        order: the profile card, the topics, then proposals, matches and the ghotok's controls; on a wide screen the
        profile card stays on the left and the rest runs down the right.
      */}
      <FamilyBiodata
        b={p} t={T} full={{ ...p, photos }}
        badges={
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <ProfileBadge status={p.status} />
              {owner ? <ApprovalBadge approval={p.approval} /> : null}
            </div>
            <p className="text-xs text-muted">{t("pp.addedOn", { date: T.date(p.createdAt) })}</p>
          </>
        }
        more={
          <>
            <Card title={t("pp.proposals")}>
              {proposals.length ? (
                <div>
                  {proposals.map((pr) => {
                    const them = pr.patroId === p.id ? pr.patri : pr.patro;
                    return <RowLink key={pr.id} href={`/proposals/${pr.id}`} title={them.name} sub={them.district} right={<ProposalBadge status={pr.status} />} />;
                  })}
                </div>
              ) : <p className="text-sm text-muted">{t("pp.noProposals")}</p>}
              {listed && p.status === "active" ? <Link href={`/proposals/new?${p.kind}=${p.id}`} className={quietButton}><Icon name="plus" size={18} />{t("pp.propose")}</Link> : null}
            </Card>

            {listed && p.status === "active" ? (
              <Card title={t("pp.possible", { kind: t(`kind.${other}`) })}>
                {suggestions.length ? (
                  <ul className="flex flex-col gap-3">
                    {suggestions.map((s) => (
                      <li key={s.candidate.id} className="flex flex-col gap-2 rounded-2xl bg-sunk p-3">
                        <div className="flex items-center justify-between gap-3">
                          <Link href={`/profiles/${s.candidate.id}`} className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{s.candidate.name} <span className="font-normal text-muted">· {T.years(ageFromYear(s.candidate.birthYear))}</span></span>
                            <span className="block truncate text-sm text-muted">{[s.candidate.village, s.candidate.upazila, s.candidate.district].filter(Boolean).join(", ")}</span>
                          </Link>
                          <Link href={pairHref(s.candidate.id)} className={`${primaryButton} min-h-10 px-3 text-sm`}>{t("pp.proposeShort")}</Link>
                        </div>
                        {s.reasons.length ? <div className="flex flex-wrap gap-1.5">{s.reasons.map((r) => <Badge key={r.key} tone="mint">{t(`reason.${r.key}`, { n: r.n ?? 0 })}</Badge>)}</div> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>{t("pp.noSuggestions", { kind: t(`kind.${other}`) })}</Empty>
                )}
              </Card>
            ) : null}
            <Card title={t("pp.parentsTitle")}>
              <p className="text-sm text-muted">{p.showParents ? t("pp.parentsOn") : t("pp.parentsOff")}</p>
              <ShowParentsForm id={p.id} shown={p.showParents} />
            </Card>

            <Card title={t("pp.status")}>
              <ProfileStatusForm id={p.id} current={p.status} />
              <p className="text-xs text-muted">{t("pp.statusHint")}</p>
            </Card>

            {listed ? <ShareCard id={p.id} no={no} link={share ? `${origin}/b/${share}` : null} /> : null}

            <details className="rounded-2xl border border-line bg-surface p-4">
              <summary className="cursor-pointer font-semibold text-neg">{t("common.delete")}</summary>
              <div className="pt-4"><DeleteProfileForm id={p.id} kind={p.kind} /></div>
            </details>
          </>
        }
      />
    </>
  );
}

