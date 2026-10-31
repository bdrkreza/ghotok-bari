import Link from "next/link";
import { afterMarriageRows, expectationTags, familyTags } from "@/components/biodata";
import { ApprovalForm } from "@/components/biodata-forms";
import { Icon } from "@/components/icons";
import { DeleteProfileForm, ProfileStatusForm } from "@/components/proposal-forms";
import { ShareCard } from "@/components/share";
import { ApprovalBadge, Badge, Card, Empty, Facts, PageHeader, ProfileBadge, ProposalBadge, RowLink, primaryButton, quietButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { orNotFound } from "@/lib/not-found";
import { siteOrigin } from "@/lib/origin";
import { suggestFor } from "@/lib/services/match";
import { getProfile, profileOwner } from "@/lib/services/profiles";
import { proposalsFor } from "@/lib/services/proposals";
import { getShare } from "@/lib/services/share";
import { ageFromYear } from "@/lib/time";

export default async function ProfilePage(props: PageProps<"/profiles/[id]">) {
  const [user, T] = await Promise.all([requireAdmin(), getT()]);
  const { t } = T;
  const { id } = await props.params;
  const db = getDb();
  const p = await orNotFound(getProfile(db, user.ghotokId, id));
  const listed = p.approval === "approved";
  const [proposals, suggestions, share, owner, origin] = await Promise.all([
    proposalsFor(db, user.ghotokId, p.id),
    listed && p.status === "active" ? suggestFor(db, user.ghotokId, p) : Promise.resolve([]),
    getShare(db, user.ghotokId, p.id),
    profileOwner(db, user.ghotokId, p),
    siteOrigin(),
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

      {/* One column on a phone, in this order. On a wide screen the person and their matches sit on the left, the controls on the right. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5 lg:col-span-3">
          <Card>
            <div className="flex items-start gap-4">
              {p.photoUrl ? (
                // a plain <img>: the link may point anywhere, and next/image would need every host listed in config
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photoUrl} alt="" className="size-24 shrink-0 rounded-2xl border border-line object-cover" />
              ) : (
                <div aria-hidden className="grid size-24 shrink-0 place-items-center rounded-2xl bg-sunk text-muted"><Icon name={p.kind === "patro" ? "groom" : "bride"} size={40} /></div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <ProfileBadge status={p.status} />
                <p className="flex items-center gap-1.5 text-sm text-muted"><Icon name="location" size={16} />{[p.village, p.upazila, p.district].filter(Boolean).join(", ")}</p>
                {p.guardianPhone ? (
                  <a href={`tel:${p.guardianPhone}`} className="flex items-center gap-1.5 text-sm font-bold text-primary"><Icon name="phone" size={16} />{T.n(p.guardianPhone)}{p.guardianName ? ` · ${p.guardianName}` : ""}</a>
                ) : null}
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
              [t("facts.complexion"), p.complexion ? t(`complexion.${p.complexion}`) : null],
              [t("facts.weight"), p.weightKg ? t("facts.kg", { n: p.weightKg }) : null],
              [t("facts.blood"), p.bloodGroup],
              [t("facts.medium"), p.educationMedium ? t(`medium.${p.educationMedium}`) : null],
              [t("facts.workplace"), p.workplace],
              [t("facts.presentAddress"), p.presentAddress],
              [t("facts.religiousPractice"), p.religiousPractice],
            ]} />
            {familyTags(p, T).length ? <p className="flex flex-wrap gap-1.5">{familyTags(p, T).map((x) => <Badge key={x} tone="sky">{x}</Badge>)}</p> : null}
            {p.familyDetails ? <Text label={t("facts.family")} value={p.familyDetails} /> : null}
            {afterMarriageRows(p, T).length ? <Text label={t("facts.after")} value={afterMarriageRows(p, T).map(([q, a]) => `${q} ${a}`).join("\n")} /> : null}
            {expectationTags(p, T).length ? <p className="flex flex-wrap gap-1.5">{expectationTags(p, T).map((x) => <Badge key={x} tone="sky">{x}</Badge>)}</p> : null}
            {p.expectations ? <Text label={t("facts.expectations")} value={p.expectations} /> : null}
            {p.notes ? <Text label={t("facts.notes")} value={p.notes} /> : null}
            <p className="text-xs text-muted">{t("pp.addedOn", { date: T.date(p.createdAt) })}</p>
          </Card>

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
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card title={t("pp.status")}>
            <ProfileStatusForm id={p.id} current={p.status} />
            <p className="text-xs text-muted">{t("pp.statusHint")}</p>
          </Card>

          {listed ? <ShareCard id={p.id} no={no} link={share ? `${origin}/b/${share}` : null} /> : null}

          <details className="rounded-2xl border border-line bg-surface p-4">
            <summary className="cursor-pointer font-semibold text-neg">{t("common.delete")}</summary>
            <div className="pt-4"><DeleteProfileForm id={p.id} kind={p.kind} /></div>
          </details>
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
