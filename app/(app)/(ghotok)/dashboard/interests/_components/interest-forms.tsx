"use client";

import { ActionForm, Hidden } from "@/components/form";
import { Icon } from "@/components/icons";
import { proposeFromInterestAction, setInterestStatusAction } from "@/lib/actions/interests";
import type { InterestStatus } from "@/lib/db/schema";
import { useT } from "@/lib/i18n/client";

/** The buttons under one request: propose (when the family said for whom), call, close, or open again. */
export function InterestActions({ id, status, canPropose, phone }: { id: string; status: InterestStatus; canPropose: boolean; phone: string }) {
  const { t } = useT();
  if (status === "closed") {
    return (
      <ActionForm action={setInterestStatusAction} tone="quiet" compact submitLabel={t("in.reopen")}>
        {() => <><Hidden name="id" value={id} /><Hidden name="status" value="new" /></>}
      </ActionForm>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {canPropose ? (
        <ActionForm action={proposeFromInterestAction} compact submitLabel={<><Icon name="rings" size={16} />{t("in.propose")}</>}>
          {() => <Hidden name="id" value={id} />}
        </ActionForm>
      ) : null}
      <a href={`tel:${phone}`} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-bold"><Icon name="phone" size={16} />{t("in.call")}</a>
      <ActionForm action={setInterestStatusAction} tone="quiet" compact submitLabel={t("in.close")}>
        {() => <><Hidden name="id" value={id} /><Hidden name="status" value="closed" /></>}
      </ActionForm>
    </div>
  );
}
