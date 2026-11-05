import type { Metadata } from "next";
import Link from "next/link";
import { Notices } from "./_components/notices";
import { Completeness } from "@/components/completeness";
import { Avatar } from "@/components/avatar";
import { FamilyBiodataCard } from "@/components/biodata";
import { Icon, type IconName } from "@/components/icons";
import { ContactButtons } from "@/components/site";
import { ApprovalBadge, Badge, Card, outlineButton, primaryButton, quietButton } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { myBiodata, recentBiodata } from "@/lib/services/biodata";
import { myFavorites, myInterests } from "@/lib/services/interests";
import { matchesForFamily } from "@/lib/services/match";
import { myMeetings } from "@/lib/services/meetings";
import { unreadNotices } from "@/lib/services/notices";
import { publicSite } from "@/lib/services/site";
import { ageFromYear } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("me.title") };
}

/**
 * The family's home: the numbers at a glance, a checklist that follows where they are, the biodata they handed in,
 * the people listed most recently, and the ghotok to call.
 */
export default async function MePage() {
  const [me, T] = await Promise.all([requireCustomer(), getT()]);
  const { t } = T;
  const db = getDb();
  const [site, mine, recent, notices, matches, favorites, interests, meetings] = await Promise.all([
    publicSite(db), myBiodata(db, me.ghotokId, me.id), recentBiodata(db, me.ghotokId), unreadNotices(db, me.ghotokId, me.id),
    matchesForFamily(db, me.ghotokId, me.id), myFavorites(db, me.ghotokId, me.id), myInterests(db, me.ghotokId, me.id),
    myMeetings(db, me.ghotokId, me.id),
  ]);
  const noticeItems = notices.map((n) => ({
    id: n.id, kind: n.kind,
    // a meeting's note is its place, said with its time rather than as the ghotok's words
    note: n.kind === "meeting" ? null : n.note,
    when: n.kind === "meeting" && n.at ? [T.dateTime(n.at), n.note].filter(Boolean).join(" · ") : T.date(n.createdAt),
    no: n.profileKind && n.profileCode !== null ? T.biodataNo(n.profileKind, n.profileCode) : "",
    // their own biodata opens on their side; one they asked about, on the list side
    href: n.profileId ? (n.ownedBy === me.id ? `/me/biodata/${n.profileId}` : `/biodata/${n.profileId}`) : null,
  }));
  const pending = mine.filter((b) => b.approval === "pending").length;
  const returned = mine.filter((b) => b.approval === "returned").length;
  const listed = mine.filter((b) => b.approval === "approved").length;

  // where the family is: account made, biodata handed in, approved, now looking
  const steps: { title: string; text: string; state: "done" | "now" | "later"; href?: string; cta?: string }[] = [
    { title: t("me.stepAccount"), text: t("me.stepAccountText", { phone: T.n(me.phone) }), state: "done" },
    mine.length
      ? { title: t("me.stepSubmitted"), text: t("me.stepSubmittedText", { n: mine.length }), state: "done" }
      : { title: t("me.stepSubmit"), text: t("me.stepSubmitText"), state: "now", href: "/me/biodata/new", cta: t("me.stepStart") },
    listed
      ? { title: t("me.stepListed"), text: t("me.stepListedText", { n: listed }), state: "done" }
      : returned
        ? { title: t("me.stepReturned"), text: t("me.stepReturnedText"), state: "now" }
        : pending
          ? { title: t("me.stepWaiting"), text: t("me.stepWaitingText"), state: "now" }
          : { title: t("me.stepApproval"), text: t("me.stepApprovalText"), state: "later" },
    { title: t("me.stepBrowse"), text: t("me.stepBrowseText"), state: listed ? "now" : "later", href: "/patri", cta: t("me.stepSee") },
  ];

  return (
    <>
      <section className="henna-corner flex flex-col gap-4 rounded-3xl border border-primary-soft bg-linear-to-br from-primary-soft/60 via-bg to-surface p-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:p-8">
        <div className="flex flex-col items-start gap-3">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">{site?.name}</span>
          <h1 className="font-display text-3xl/[1.2] font-extrabold lg:text-4xl/[1.2]">
            {t("me.greeting")}<br /><span className="text-primary">{me.name}</span>
          </h1>
          <p className="text-muted lg:text-lg">
            {mine.length
              ? pending ? t("me.pendingLine", { n: pending }) : returned ? t("me.returnedLine") : t("me.listedLine")
              : t("me.noneLine")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex lg:shrink-0">
          <Link href="/me/biodata/new" className={`${primaryButton} col-span-2 sm:col-span-1`}><Icon name="plus" size={18} />{t("me.submit")}</Link>
          <Link href="/patro" className={outlineButton}>{t("me.seePatro")}</Link>
          <Link href="/patri" className={outlineButton}>{t("me.seePatri")}</Link>
        </div>
      </section>

      <Notices items={noticeItems} />

      {meetings.length ? (
        <section aria-label={t("me.meetings")} className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
          <p className="flex items-center gap-2 font-bold"><Icon name="calendar" size={20} className="text-primary" />{t("me.meetings")}</p>
          <ul className="flex flex-col divide-y divide-line">
            {meetings.map((m) => (
              <li key={m.id} className="py-2">
                <p className="font-semibold">{T.dateTime(m.at)}</p>
                <p className="text-sm text-muted">{[T.biodataNo(m.kind, m.code), m.place].filter(Boolean).join(" · ")}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t("me.meetingsHint")}</p>
        </section>
      ) : null}

      <section aria-label={t("me.glance")} className="grid grid-cols-3 gap-1 rounded-3xl border border-line bg-surface p-2">
        <Stat icon="note" value={T.n(mine.length)} label={pending ? t("me.myBiodataPending", { n: pending }) : t("me.myBiodata")} href="#amar" />
        <Stat icon="groom" value={T.n(site?.patro ?? 0)} label={t("front.patroLooking")} href="/patro" />
        <Stat icon="bride" value={T.n(site?.patri ?? 0)} label={t("front.patriLooking")} href="/patri" />
      </section>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-4">
            <SectionHead eyebrow={t("me.progress")} title={listed ? t("me.allGood") : t("me.nextStep")} />
            <ol className="flex flex-col divide-y divide-line rounded-3xl border border-line bg-surface">
              {steps.map((s, i) => (
                <li key={s.title} className={`flex items-center gap-4 p-4 ${s.state === "later" ? "opacity-60" : ""}`}>
                  <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${s.state === "done" ? "bg-pos text-bg" : s.state === "now" ? "bg-primary text-on-primary" : "bg-sunk text-muted"}`}>
                    {s.state === "done" ? <Icon name="check" size={18} /> : T.n(i + 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{s.title}</span>
                    <span className="block text-sm text-muted">{s.text}</span>
                  </span>
                  {s.href && s.state === "now" ? <Link href={s.href} className={`${primaryButton} min-h-10 shrink-0 px-3 text-sm`}>{s.cta}</Link> : null}
                </li>
              ))}
            </ol>
          </section>

          <section id="amar" className="flex flex-col gap-4 scroll-mt-24">
            <SectionHead eyebrow={t("me.myBiodata")} title={t("me.yourBiodata")}
              links={mine.length ? [{ href: "/me/biodata/new", label: t("me.newBiodata") }] : []} />
            {mine.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {mine.map((b) => (
                  <li key={b.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
                    <div className="flex items-start gap-3">
                      <Avatar kind={b.kind} photoUrl={b.photoUrl} className="size-14" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{b.name}</p>
                        <p className="truncate text-sm text-muted">{t(`kind.${b.kind}`)} · {T.biodataNo(b.kind, b.code)} · {T.years(ageFromYear(b.birthYear))} · {b.district}</p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-2">
                          <ApprovalBadge approval={b.approval} />
                          <span className="text-xs text-muted">{b.approval === "pending" ? t("me.submittedOn", { date: T.date(b.updatedAt) }) : t("me.updatedOn", { date: T.date(b.updatedAt) })}</span>
                        </p>
                      </div>
                    </div>
                    {b.approval === "returned" ? (
                      <p className="rounded-xl bg-neg-soft px-3 py-2 text-sm font-semibold text-neg">{t("me.ghotokNote", { note: b.returnNote ?? t("me.noReason") })}</p>
                    ) : null}
                    <Completeness p={b} t={T} />
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <Link href={`/me/biodata/${b.id}`} className={`${quietButton} min-h-10 text-sm`}>{t("common.view")}</Link>
                      <Link href={`/me/biodata/${b.id}/edit`} className={`${b.approval === "returned" ? primaryButton : outlineButton} min-h-10 text-sm`}><Icon name="edit" size={16} />{b.approval === "returned" ? t("me.fix") : t("common.edit")}</Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line bg-surface px-5 py-8 text-center">
                <span aria-hidden className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="note" size={26} /></span>
                <div className="flex flex-col gap-1">
                  <p className="font-display text-lg font-bold">{t("me.firstTitle")}</p>
                  <p className="max-w-md text-sm text-muted">{t("me.firstText")}</p>
                </div>
                <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
                  <Link href="/me/biodata/new?kind=patro" className={outlineButton}><Icon name="groom" size={18} />{t("me.groomBiodata")}</Link>
                  <Link href="/me/biodata/new?kind=patri" className={primaryButton}><Icon name="bride" size={18} />{t("me.brideBiodata")}</Link>
                </div>
              </div>
            )}
          </section>

          {matches.length ? (
            <section className="flex flex-col gap-4">
              <SectionHead eyebrow={t("me.matchEyebrow")} title={t("me.matchTitle")} />
              <p className="-mt-2 text-sm text-muted">{t("me.matchText")}</p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {matches.map((m) => (
                  <li key={m.b.id} className="flex min-w-0 flex-col gap-2">
                    <FamilyBiodataCard b={m.b} t={T} />
                    {m.reasons.length ? <div className="flex flex-wrap gap-1.5">{m.reasons.map((r) => <Badge key={r.key} tone="mint">{t(`reason.${r.key}`, { n: r.n ?? 0 })}</Badge>)}</div> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {favorites.length ? (
            <section className="flex flex-col gap-4">
              <SectionHead eyebrow={t("me.favEyebrow")} title={t("me.favTitle", { n: favorites.length })} />
              <ul className="grid gap-3 sm:grid-cols-2">
                {favorites.map((b) => <li key={b.id} className="min-w-0"><FamilyBiodataCard b={b} t={T} /></li>)}
              </ul>
            </section>
          ) : null}

          {recent.length ? (
            <section className="flex flex-col gap-4">
              <SectionHead eyebrow={t("me.listEyebrow")} title={t("me.recent")} links={[{ href: "/patro", label: t("me.allPatro") }, { href: "/patri", label: t("me.allPatri") }]} />
              <ul className="grid gap-3 sm:grid-cols-2">
                {recent.map((b) => <li key={b.id} className="min-w-0"><FamilyBiodataCard b={b} t={T} /></li>)}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-4">
            <SectionHead eyebrow={t("common.ghotok")} title={t("me.contact")} />
            {site ? (
              <Card>
                <div className="flex items-center gap-3">
                  <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary">ঘ</span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{site.ghotokName}</p>
                    <p className="truncate text-sm text-muted">{site.address ?? site.name}</p>
                  </div>
                </div>
                <p className="text-sm text-muted">{t("me.contactText")}</p>
                <ContactButtons phone={site.phone} whatsapp={site.whatsapp} t={T} />
              </Card>
            ) : null}
          </section>
          {interests.length ? (
            <Card title={t("me.interestsTitle")}>
              <ul className="divide-y divide-line">
                {interests.map((i) => (
                  <li key={i.b.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/biodata/${i.b.id}`} className="min-w-0">
                      <span className="block font-bold text-primary">{T.biodataNo(i.b.kind, i.b.code)}</span>
                      <span className="block truncate text-xs text-muted">{i.b.district} · {T.date(i.createdAt)}</span>
                    </Link>
                    <Badge tone={i.status === "proposed" ? "mint" : i.status === "closed" ? "coral" : "mango"}>{t(`me.interest.${i.status}`)}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          <Card title={t("me.whoSees")}>
            <p className="text-sm text-muted">{t("me.whoSeesText")}</p>
          </Card>
        </div>
      </div>
    </>
  );
}

/** One of the three numbers at a glance; the whole thing links somewhere. */
function Stat({ icon, value, label, href }: { icon: IconName; value: string; label: string; href: string }) {
  return (
    <Link href={href} className="flex flex-col items-start gap-2 rounded-2xl p-3 hover:bg-sunk sm:flex-row sm:items-center sm:gap-4 lg:p-4">
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary sm:size-14"><Icon name={icon} size={22} /></span>
      <span className="flex min-w-0 flex-col">
        <span className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{value}</span>
        <span className="text-xs leading-tight text-muted sm:text-sm">{label}</span>
      </span>
    </Link>
  );
}

/** A small red eyebrow over the section title, with links on the right. */
function SectionHead({ eyebrow, title, links = [] }: { eyebrow: string; title: string; links?: { href: string; label: string }[] }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold text-primary">{eyebrow}</p>
        <h2 className="font-display text-xl font-bold lg:text-2xl">{title}</h2>
      </div>
      {links.length ? (
        <div className="flex shrink-0 gap-4 text-sm font-bold text-primary">
          {links.map((l) => <Link key={l.href} href={l.href}>{l.label} →</Link>)}
        </div>
      ) : null}
    </div>
  );
}
