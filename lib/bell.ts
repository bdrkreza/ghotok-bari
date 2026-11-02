import type { IconName } from "@/components/icons";
import type { T } from "./i18n";
import type { Alerts } from "./services/dashboard";
import type { NoticeRow } from "./services/notices";

// The words of the bell, built on the server in the reader's language: for the list in the bar
// (app/(app)/layout.tsx) and for the phone's notification when the site is closed (/api/push/latest).

/** One line in the bell's list. */
export interface BellItem {
  key: string;
  text: string;
  /** a second, smaller line: the ghotok's note, the place, or the date */
  sub?: string;
  href: string;
  icon: IconName;
  /** "warn" for what needs a decision or was sent back; the rest are good news */
  tone: "warn" | "news";
  /** a family's notice they have already seen: kept in the list, faded, under "আগে দেখা" */
  seen?: boolean;
  /** a family's notice: opening it marks it seen */
  noticeId?: string;
}

/** The ghotok's side: what waits for a decision or a call, one line per kind with its count. */
export function adminItems(a: Alerts, { t }: T): BellItem[] {
  return [
    ...(a.pending ? [{ key: "pending", text: t("dash.pendingBanner", { n: a.pending }), sub: t("dash.pendingBannerText"), href: "/dashboard/approvals", icon: "note" as const, tone: "warn" as const }] : []),
    ...(a.interests ? [{ key: "interests", text: t("dash.interestBanner", { n: a.interests }), sub: t("dash.interestBannerText"), href: "/dashboard/interests", icon: "heart" as const, tone: "news" as const }] : []),
    ...(a.meetings ? [{ key: "meetings", text: t("bell.meetings", { n: a.meetings }), sub: t("bell.meetingsSub"), href: "/dashboard/meetings", icon: "calendar" as const, tone: "news" as const }] : []),
    ...(a.followUps ? [{ key: "followUps", text: t("dash.followUpTitle", { n: a.followUps }), sub: t("bell.followUpSub"), href: "/dashboard#followups", icon: "calendar" as const, tone: "warn" as const }] : []),
  ];
}

/** One of a family's notices. Their own biodata opens on their side; one they were told about, on the list side. */
export function noticeItem(n: NoticeRow & { readAt?: Date | null }, userId: string, T: T): BellItem {
  const { t } = T;
  const no = n.profileKind && n.profileCode !== null ? T.biodataNo(n.profileKind, n.profileCode) : "";
  const sub = n.kind === "meeting"
    ? [n.at ? T.dateTime(n.at) : null, n.note].filter(Boolean).join(" · ")
    : n.note ? t("me.ghotokNote", { note: n.note }) : T.date(n.createdAt);
  return {
    key: n.id,
    text: t(`me.notice.${n.kind}`, { no }),
    sub,
    href: n.profileId ? (n.ownedBy === userId ? `/me/biodata/${n.profileId}` : `/biodata/${n.profileId}`) : "/me",
    icon: n.kind === "approved" ? "check" : n.kind === "proposed" ? "rings" : n.kind === "match" ? "heart" : n.kind === "meeting" ? "calendar" : "note",
    tone: n.kind === "returned" ? "warn" : "news",
    seen: n.readAt != null,
    noticeId: n.id,
  };
}
