"use client";

import Link from "next/link";
import { ActionForm, Hidden } from "@/components/form";
import { Icon } from "@/components/icons";
import { dismissNoticeAction } from "@/lib/actions/interests";
import type { NoticeKind } from "@/lib/db/schema";
import { useT } from "@/lib/i18n/client";

export interface NoticeItem {
  id: string;
  kind: NoticeKind;
  /** "পাত্রী-৭", already in the reader's language */
  no: string;
  note: string | null;
  when: string;
  href: string | null;
}

/** What the ghotok did since the family last looked: each with a link and a dismiss button, and "dismiss all". */
export function Notices({ items }: { items: NoticeItem[] }) {
  const { t } = useT();
  if (!items.length) return null;
  return (
    <section aria-label={t("me.noticesAria")} className="flex flex-col gap-2">
      {items.map((n) => (
        <div key={n.id} className={`flex items-start gap-3 rounded-2xl border p-4 ${n.kind === "returned" ? "border-warn-line bg-warn text-warn-ink" : "border-primary-soft bg-primary-soft/50"}`}>
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface/70 text-primary">
            <Icon name={n.kind === "approved" ? "check" : n.kind === "proposed" ? "rings" : "note"} size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{t(`me.notice.${n.kind}`, { no: n.no })}</p>
            {n.note ? <p className="text-sm">{t("me.ghotokNote", { note: n.note })}</p> : null}
            <p className="text-xs opacity-80">{n.when}{n.href ? <> · <Link href={n.href} className="font-bold underline">{t("common.view")}</Link></> : null}</p>
          </div>
          <ActionForm action={dismissNoticeAction} tone="quiet" inline compact submitLabel={<Icon name="close" size={16} />} submitAriaLabel={t("me.dismiss")}>
            {() => <Hidden name="id" value={n.id} />}
          </ActionForm>
        </div>
      ))}
      {items.length > 1 ? (
        <div className="self-end">
          <ActionForm action={dismissNoticeAction} tone="quiet" compact submitLabel={t("me.dismissAll")}>
            {() => null}
          </ActionForm>
        </div>
      ) : null}
    </section>
  );
}
