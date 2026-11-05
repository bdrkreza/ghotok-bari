import Link from "next/link";
import { HomeSearch } from "./_components/home-search";
import { StatOrbit } from "./_components/stat-orbit";
import { Icon, type IconName } from "@/components/icons";
import { Empty, ProfileBadge, ProposalBadge, outlineButton, primaryButton, quietButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { initial } from "@/lib/bn";
import { getDb } from "@/lib/db";
import type { Key, T } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { dashboard } from "@/lib/services/dashboard";

const PROMISES: { icon: IconName; title: Key; text: Key }[] = [
  { icon: "shield", title: "dash.promise1Title", text: "dash.promise1Text" },
  { icon: "people", title: "dash.promise2Title", text: "dash.promise2Text" },
  { icon: "card", title: "dash.promise3Title", text: "dash.promise3Text" },
];

export default async function HomePage() {
  const [user, T] = await Promise.all([requireAdmin(), getT()]);
  const { t } = T;
  const d = await dashboard(getDb(), user.ghotokId);
  // share of the agreed fees already in hand
  const pct = d.money.chukti > 0 ? Math.min(100, Math.round((d.money.joma / d.money.chukti) * 100)) : 0;

  return (
    <>
      <section className="henna-corner flex flex-col gap-5 rounded-3xl border border-primary-soft bg-linear-to-br from-primary-soft/60 via-bg to-surface p-5 lg:gap-7 lg:p-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="flex flex-col items-start gap-3">
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">{t("dash.badge")}</span>
            <h1 className="font-display text-3xl/[1.2] font-extrabold lg:text-5xl/[1.2]">
              {t("me.greeting")}<br /><span className="text-primary">{user.name}</span>
            </h1>
            <p className="text-muted lg:text-lg">
              {d.live ? t("dash.live", { n: d.live }) : t("dash.noLive")} {t("dash.addHint")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:flex lg:shrink-0">
            <Link href="/profiles/new?kind=patro" className={outlineButton}><Icon name="plus" size={18} />{t("dash.newPatro")}</Link>
            <Link href="/profiles/new?kind=patri" className={primaryButton}><Icon name="plus" size={18} />{t("dash.newPatri")}</Link>
          </div>
        </div>
        <HomeSearch places={d.places} />
      </section>

      <StatOrbit centre={{ value: T.n(d.patro + d.patri), label: t("dash.orbitCentre") }} stats={[
        { href: "/patro", value: T.n(d.patro), label: t("front.patroLooking"), icon: "groom", tone: "sky" },
        { href: "/patri", value: T.n(d.patri), label: t("front.patriLooking"), icon: "bride", tone: "rose" },
        { href: "/proposals", value: T.n(d.live), label: t("dash.liveProposals"), icon: "heart", tone: "mango" },
        { href: "/proposals?status=all", value: T.n(d.fixed), label: t("dash.fixed"), icon: "check", tone: "mint" },
      ]} />

      {d.pending ? (
        <Link href="/dashboard/approvals" className="flex items-center gap-4 rounded-2xl border border-warn-line bg-warn p-4 text-warn-ink">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-surface/70"><Icon name="note" size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{t("dash.pendingBanner", { n: d.pending })}</span>
            <span className="block text-sm">{t("dash.pendingBannerText")}</span>
          </span>
          <Icon name="chevronRight" size={18} />
        </Link>
      ) : null}

      {d.interests ? (
        <Link href="/dashboard/interests" className="flex items-center gap-4 rounded-2xl border border-primary-soft bg-primary-soft/50 p-4">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-surface/70 text-primary"><Icon name="heart" size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{t("dash.interestBanner", { n: d.interests })}</span>
            <span className="block text-sm text-muted">{t("dash.interestBannerText")}</span>
          </span>
          <Icon name="chevronRight" size={18} />
        </Link>
      ) : null}

      {d.followUps.length ? (
        <section id="followups" className="flex scroll-mt-24 flex-col gap-3 rounded-3xl border border-warn-line bg-warn p-4 text-warn-ink lg:p-5">
          <p className="flex items-center gap-2 font-bold"><Icon name="calendar" size={20} />{t("dash.followUpTitle", { n: d.followUps.length })}</p>
          <ul className="flex flex-col gap-2">
            {d.followUps.map((f) => (
              <li key={f.id} className="flex flex-col gap-2 rounded-2xl bg-surface p-3 text-ink sm:flex-row sm:items-center">
                <Link href={`/proposals/${f.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{t("common.and", { a: f.patro.name, b: f.patri.name })}</span>
                  <span className="block text-sm text-muted">{f.followUpOn ? t("dash.followUpSince", { date: T.date(f.followUpOn) }) : null}</span>
                </Link>
                <span className="flex shrink-0 gap-2">
                  {f.patro.guardianPhone ? <a href={`tel:${f.patro.guardianPhone}`} className={`${quietButton} min-h-10 px-3 text-sm`}><Icon name="phone" size={16} />{t("kind.patro")}</a> : null}
                  {f.patri.guardianPhone ? <a href={`tel:${f.patri.guardianPhone}`} className={`${quietButton} min-h-10 px-3 text-sm`}><Icon name="phone" size={16} />{t("kind.patri")}</a> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {d.stale.length ? (
        <section className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4 lg:p-5">
          <p className="flex items-center gap-2 font-bold"><Icon name="bell" size={20} />{t("dash.staleTitle", { n: d.stale.length })}</p>
          <ul className="flex flex-col gap-2">
            {d.stale.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 rounded-2xl bg-bg p-3 sm:flex-row sm:items-center">
                <Link href={`/proposals/${s.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{t("common.and", { a: s.patro.name, b: s.patri.name })}</span>
                  <span className="block text-sm text-muted">{t("dash.staleIdle", { n: s.idleDays })}</span>
                </Link>
                <span className="flex shrink-0 gap-2">
                  {s.patro.guardianPhone ? <a href={`tel:${s.patro.guardianPhone}`} className={`${quietButton} min-h-10 px-3 text-sm`}><Icon name="phone" size={16} />{t("kind.patro")}</a> : null}
                  {s.patri.guardianPhone ? <a href={`tel:${s.patri.guardianPhone}`} className={`${quietButton} min-h-10 px-3 text-sm`}><Icon name="phone" size={16} />{t("kind.patri")}</a> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8">
        <section className="flex flex-col gap-4">
          <SectionHead eyebrow={t("dash.liveProposals")} title={t("dash.liveTitle")} links={[{ href: "/proposals", label: t("dash.allProposals") }]} />
          {d.recent.length ? (
            <ul className="flex flex-col gap-3">
              {d.recent.map((p) => (
                <li key={p.id}>
                  <Link href={`/proposals/${p.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-primary/40">
                    <span aria-hidden className="flex shrink-0 -space-x-3">
                      <span className="grid size-12 place-items-center rounded-full bg-sky font-display text-lg font-bold text-sky-ink ring-2 ring-surface">{initial(p.patro.name)}</span>
                      <span className="grid size-12 place-items-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary ring-2 ring-surface">{initial(p.patri.name)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{t("common.and", { a: p.patro.name, b: p.patri.name })}</span>
                      <span className="block truncate text-sm text-muted">{p.patro.district} · {p.patri.district}</span>
                    </span>
                    <ProposalBadge status={p.status} />
                    <Icon name="chevronRight" size={18} className="text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty action={<Link href="/proposals/new" className={quietButton}>{t("dash.firstProposal")}</Link>}>{t("dash.noProposals")}</Empty>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <SectionHead eyebrow={t("dash.moneyEyebrow")} title={t("dash.moneyTitle")} />
          <div className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-5 lg:p-6">
            <div>
              <p className="text-sm text-muted">{t("dash.totalAgreed")}</p>
              <p className="font-display text-3xl font-bold tabular-nums lg:text-4xl">{T.money(d.money.chukti)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <div role="progressbar" aria-label={t("dash.collection")} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-primary-soft">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-sm text-muted">{t("dash.collected", { p: pct })}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-pos-soft p-4">
                <p className="text-sm font-semibold text-pos">{t("dash.received")}</p>
                <p className="font-display text-xl font-bold tabular-nums text-pos">{T.money(d.money.joma)}</p>
              </div>
              <div className="rounded-2xl bg-neg-soft p-4">
                <p className="text-sm font-semibold text-neg">{t("dash.due")}</p>
                <p className="font-display text-xl font-bold tabular-nums text-neg">{T.money(d.money.baki)}</p>
              </div>
            </div>
            <Link href="/hisab" className={outlineButton}>{t("dash.fullLedger")}</Link>
          </div>
          <LinkCard icon="note" title={t("dash.requestsCard")} text={d.pending ? t("dash.requestsPending", { n: d.pending }) : t("dash.requestsNone")} href="/dashboard/approvals" t={T} />
          <LinkCard icon="heart" title={t("dash.interestsCard")} text={d.interests ? t("dash.interestsNew", { n: d.interests }) : t("dash.interestsNone")} href="/dashboard/interests" t={T} />
          <LinkCard icon="calendar" title={t("mt.title")}
            text={d.meetings[0] ? t("dash.meetingNext", { when: T.dateTime(d.meetings[0].at), pair: t("common.and", { a: d.meetings[0].proposal.patro.name, b: d.meetings[0].proposal.patri.name }) }) : t("dash.meetingsNone")}
            href="/dashboard/meetings" t={T} />
          <LinkCard icon="people" title={t("dash.customersCard")} text={t("dash.customersText")} href="/dashboard/customers" t={T} />
          <LinkCard icon="edit" title={t("dash.siteCard")} text={t("dash.siteText")} href="/dashboard/site" t={T} />
          <LinkCard icon="note" title={t("dash.activityCard")} text={t("dash.activityText")} href="/dashboard/activity" t={T} />
          <LinkCard icon="people" title={t("vl.title")} text={t("dash.visitsText")} href="/dashboard/visits" t={T} />
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <SectionHead eyebrow={t("dash.profilesEyebrow")} title={t("dash.recentProfiles")} links={[{ href: "/patro", label: t("me.allPatro") }, { href: "/patri", label: t("me.allPatri") }]} />
        {d.people.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {d.people.map((p) => (
              <li key={p.id}>
                <Link href={`/profiles/${p.id}`} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-2.5 hover:border-primary/40">
                  <span className="relative block aspect-4/3 overflow-hidden rounded-xl bg-sunk">
                    {p.photoUrl ? (
                      // a plain <img>: the link may point anywhere, and next/image would need every host listed in config
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="flex size-full flex-col items-center justify-center gap-1 text-xs text-muted"><Icon name="lock" size={22} />{t("common.photoHidden")}</span>
                    )}
                    <span className="absolute top-2 right-2"><ProfileBadge status={p.status} /></span>
                  </span>
                  <span className="flex flex-col px-1 pb-1">
                    <span className="truncate font-bold">{p.name}</span>
                    <span className="truncate text-sm text-muted">{t(`kind.${p.kind}`)} · {p.district}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty action={<Link href="/profiles/new?kind=patro" className={quietButton}><Icon name="plus" size={18} />{t("dash.addFirst")}</Link>}>{t("dash.noProfiles")}</Empty>
        )}
      </section>

      <section aria-label={t("dash.promises")} className="grid gap-4 rounded-3xl bg-sky/40 p-5 sm:grid-cols-3 lg:p-6">
        {PROMISES.map((p) => (
          <div key={p.title} className="flex items-center gap-4">
            <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-bg"><Icon name={p.icon} size={22} /></span>
            <span className="flex flex-col">
              <span className="font-bold">{t(p.title)}</span>
              <span className="text-sm text-muted">{t(p.text)}</span>
            </span>
          </div>
        ))}
      </section>
    </>
  );
}

/** A row that opens one of the ghotok's secondary screens. */
function LinkCard({ icon, title, text, href, t }: { icon: IconName; title: string; text: string; href: string; t: T }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={icon} size={22} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-muted">{text}</span>
      </span>
      <Link href={href} className="shrink-0 text-sm font-bold text-primary">{t.t("common.seeMore")}</Link>
    </div>
  );
}

/** A small red eyebrow over the section title, with "see all" links on the right. */
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
