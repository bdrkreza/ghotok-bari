"use client";

import { ActionForm, Hidden, Select, TextArea } from "@/components/form";
import { Icon } from "@/components/icons";
import { expressInterestAction, toggleFavoriteAction, withdrawInterestAction } from "@/lib/actions/interests";
import type { InterestStatus } from "@/lib/db/schema";
import { useT } from "@/lib/i18n/client";

type Option = readonly [string, string];

/**
 * "আগ্রহ জানান": tell the ghotok this biodata suits, optionally for which of the family's own listed biodata and with
 * a line. Once sent, says so and offers to take it back while the ghotok has not acted.
 */
export function InterestCard({ id, sent, own }: { id: string; sent: { status: InterestStatus; at: string } | null; own: Option[] }) {
  const { t } = useT();
  if (sent) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-pos-soft p-3">
        <p className="flex items-center gap-2 text-sm font-bold text-pos"><Icon name="check" size={16} />{t(`bv.interest.${sent.status}`)}</p>
        <p className="text-xs text-muted">{t("bv.interestOn", { date: sent.at })}</p>
        {sent.status === "new" ? (
          <ActionForm action={withdrawInterestAction} tone="quiet" compact submitLabel={t("bv.withdraw")}>
            {() => <Hidden name="id" value={id} />}
          </ActionForm>
        ) : null}
      </div>
    );
  }
  return (
    <ActionForm action={expressInterestAction} submitLabel={<><Icon name="heart" size={18} />{t("bv.interest")}</>}>
      {(v) => (
        <>
          <Hidden name="id" value={id} />
          <p className="text-sm text-muted">{t("bv.interestText")}</p>
          {own.length ? <Select name="forProfileId" label={t("bv.forWhom")} options={own} placeholder={t("bv.forWhomSkip")} defaultValue={v.forProfileId ?? (own.length === 1 ? own[0][0] : "")} /> : null}
          <TextArea name="note" label={t("bv.interestNote")} placeholder={t("bv.interestNotePlaceholder")} rows={2} maxLength={500} defaultValue={v.note} />
        </>
      )}
    </ActionForm>
  );
}

/** Put the biodata on the family's short list, or take it off. */
export function FavoriteButton({ id, on }: { id: string; on: boolean }) {
  const { t } = useT();
  return (
    <ActionForm action={toggleFavoriteAction} tone="quiet" submitLabel={<><Icon name="heart" size={18} className={on ? "fill-current text-primary" : ""} />{on ? t("bv.unfavorite") : t("bv.favorite")}</>}>
      {() => <Hidden name="id" value={id} />}
    </ActionForm>
  );
}
