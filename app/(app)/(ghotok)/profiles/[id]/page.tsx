import Link from "next/link";
import { ApprovalForm } from "@/components/biodata-forms";
import { Icon } from "@/components/icons";
import { DeleteProfileForm, ProfileStatusForm } from "@/components/proposal-forms";
import { ShareCard } from "@/components/share";
import { Badge, Card, Empty, Facts, PageHeader, ProfileBadge, ProposalBadge, RowLink, primaryButton, quietButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { APPROVAL, MARITAL, RELIGION, biodataNo, bn, heightLabel, taka, KIND_LABEL } from "@/lib/bn";
import { getDb } from "@/lib/db";
import { orNotFound } from "@/lib/not-found";
import { siteOrigin } from "@/lib/origin";
import { suggestFor } from "@/lib/services/match";
import { getProfile, profileOwner } from "@/lib/services/profiles";
import { proposalsFor } from "@/lib/services/proposals";
import { getShare } from "@/lib/services/share";
import { ageFromYear, formatDate } from "@/lib/time";

export default async function ProfilePage(props: PageProps<"/profiles/[id]">) {
  const user = await requireAdmin();
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

  return (
    <>
      <PageHeader title={p.name} back={back} sub={`${biodataNo(p.kind, p.code)} · ${bn(ageFromYear(p.birthYear))} বছর`}
        action={<Link href={`/profiles/${p.id}/edit`} aria-label="সম্পাদনা" className="grid size-11 place-items-center rounded-2xl border border-line bg-surface"><Icon name="edit" /></Link>} />

      {/* A biodata a family handed in: who wrote it, and the decision buttons. First on the page, since that is what the ghotok came for. */}
      {owner ? (
        <Card title={listed ? "পরিবারের দেওয়া বায়োডাটা" : "অনুমোদনের অপেক্ষায়"} className={listed ? "" : "border-warn-line bg-warn"}>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={APPROVAL[p.approval].tone}>{APPROVAL[p.approval].label}</Badge>
            <span className="text-muted">দিয়েছেন <span className="font-bold text-ink">{owner.name}</span> · <a href={`tel:${owner.phone}`} className="font-bold text-primary">{bn(owner.phone)}</a> · {formatDate(p.updatedAt)}</span>
          </p>
          {p.approval === "returned" && p.returnNote ? <p className="text-sm text-muted">আপনার নোট: {p.returnNote}</p> : null}
          {listed ? null : <p className="text-sm text-muted">তালিকায় তুললে অন্য পরিবার নাম-ছবি ছাড়া এটি দেখবে, আর মিল-খোঁজা ও প্রস্তাবে আসবে। পরিবার পরে বদলালে আবার এখানে ফিরবে।</p>}
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
                  <a href={`tel:${p.guardianPhone}`} className="flex items-center gap-1.5 text-sm font-bold text-primary"><Icon name="phone" size={16} />{bn(p.guardianPhone)}{p.guardianName ? ` · ${p.guardianName}` : ""}</a>
                ) : null}
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
            {p.notes ? <Text label="ঘটকের নোট" value={p.notes} /> : null}
            <p className="text-xs text-muted">যোগ করা হয়েছে {formatDate(p.createdAt)}</p>
          </Card>

          <Card title="প্রস্তাব">
            {proposals.length ? (
              <div>
                {proposals.map((pr) => {
                  const them = pr.patroId === p.id ? pr.patri : pr.patro;
                  return <RowLink key={pr.id} href={`/proposals/${pr.id}`} title={them.name} sub={them.district} right={<ProposalBadge status={pr.status} />} />;
                })}
              </div>
            ) : <p className="text-sm text-muted">এখনো কোনো প্রস্তাব নেই।</p>}
            {listed && p.status === "active" ? <Link href={`/proposals/new?${p.kind}=${p.id}`} className={quietButton}><Icon name="plus" size={18} />প্রস্তাব দিন</Link> : null}
          </Card>

          {listed && p.status === "active" ? (
            <Card title={`সম্ভাব্য ${KIND_LABEL[other]}`}>
              {suggestions.length ? (
                <ul className="flex flex-col gap-3">
                  {suggestions.map((s) => (
                    <li key={s.candidate.id} className="flex flex-col gap-2 rounded-2xl bg-sunk p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Link href={`/profiles/${s.candidate.id}`} className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{s.candidate.name} <span className="font-normal text-muted">· {bn(ageFromYear(s.candidate.birthYear))} বছর</span></span>
                          <span className="block truncate text-sm text-muted">{[s.candidate.village, s.candidate.upazila, s.candidate.district].filter(Boolean).join(", ")}</span>
                        </Link>
                        <Link href={pairHref(s.candidate.id)} className={`${primaryButton} min-h-10 px-3 text-sm`}>প্রস্তাব</Link>
                      </div>
                      {s.reasons.length ? <div className="flex flex-wrap gap-1.5">{s.reasons.map((r) => <Badge key={r} tone="mint">{r}</Badge>)}</div> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>একই ধর্মের, খোঁজ চলছে এমন কোনো {KIND_LABEL[other]} এখন নেই।</Empty>
              )}
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card title="অবস্থা">
            <ProfileStatusForm id={p.id} current={p.status} />
            <p className="text-xs text-muted">প্রস্তাব &quot;বিয়ে ঠিক&quot; বা &quot;বিয়ে হয়েছে&quot; হলে অবস্থা নিজে থেকেই বদলায়।</p>
          </Card>

          {listed ? <ShareCard id={p.id} no={biodataNo(p.kind, p.code)} link={share ? `${origin}/b/${share}` : null} /> : null}

          <details className="rounded-2xl border border-line bg-surface p-4">
            <summary className="cursor-pointer font-semibold text-neg">মুছে ফেলুন</summary>
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
