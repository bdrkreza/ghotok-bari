import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Card, Empty, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import type { T } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { dayFromToday, pastMeetings, upcomingMeetings, type MeetingRow } from "@/lib/services/meetings";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("mt.title") };
}

/**
 * Every দেখা-দেখি: today's, tomorrow's and later ones, soonest first, then the last thirty days'. Each opens its
 * proposal, where meetings are set. Phone: one column; web: what is coming on the left, what is done on the right.
 */
export default async function MeetingsPage() {
  const [admin, T] = await Promise.all([requireAdmin(), getT()]);
  const { t } = T;
  const now = new Date();
  const [upcoming, past] = await Promise.all([upcomingMeetings(getDb(), admin.ghotokId, now), pastMeetings(getDb(), admin.ghotokId, now)]);
  const groups = [
    { key: "today", title: t("mt.today"), rows: upcoming.filter((m) => dayFromToday(m.at, now) === 0) },
    { key: "tomorrow", title: t("mt.tomorrow"), rows: upcoming.filter((m) => dayFromToday(m.at, now) === 1) },
    { key: "later", title: t("mt.later"), rows: upcoming.filter((m) => dayFromToday(m.at, now) > 1) },
  ].filter((g) => g.rows.length);

  return (
    <>
      <PageHeader title={t("mt.title")} back="/dashboard" sub={t("mt.sub")} />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          {groups.length ? groups.map((g) => (
            <Card key={g.key} title={g.title}>
              <MeetingList rows={g.rows} T={T} soon={g.key !== "later"} />
            </Card>
          )) : <Empty>{t("mt.none")}</Empty>}
        </div>
        <Card title={t("mt.past")}>
          {past.length ? <MeetingList rows={past} T={T} /> : <p className="text-sm text-muted">{t("mt.pastNone")}</p>}
        </Card>
      </div>
    </>
  );
}

function MeetingList({ rows, T, soon = false }: { rows: MeetingRow[]; T: T; soon?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((m) => (
        <li key={m.id}>
          <Link href={`/proposals/${m.proposal.id}`} className="flex items-start gap-3 py-3">
            <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-full ${soon ? "bg-primary-soft text-primary" : "bg-sunk text-muted"}`}>
              <Icon name="calendar" size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{T.t("common.and", { a: m.proposal.patro.name, b: m.proposal.patri.name })}</span>
              <span className="block text-sm">{T.dateTime(m.at)}</span>
              {m.place || m.note ? <span className="block text-sm text-muted">{[m.place, m.note].filter(Boolean).join(" · ")}</span> : null}
            </span>
            <Icon name="chevronRight" size={18} className="mt-2 shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
