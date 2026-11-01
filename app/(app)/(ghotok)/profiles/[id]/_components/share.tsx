"use client";

import { useState } from "react";
import { ActionForm, Hidden } from "@/components/form";
import { Icon } from "@/components/icons";
import { Card, quietButton } from "@/components/ui";
import { shareBiodataAction, unshareBiodataAction } from "@/lib/actions/share";
import { useT } from "@/lib/i18n/client";

/** Card on a person's page: switch the public biodata link on or off, copy it, send it on WhatsApp. */
export function ShareCard({ id, no, link }: { id: string; no: string; link: string | null }) {
  const { t } = useT();
  return (
    <Card title={t("share.title")}>
      {link ? (
        <>
          <p className="text-sm text-muted">{t("share.onText", { no })}</p>
          <div className="flex gap-2">
            <input readOnly value={link} aria-label={t("share.linkAria")} onFocus={(e) => e.currentTarget.select()}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-sunk px-3 text-sm" />
            <CopyButton text={link} />
          </div>
          <a href={`https://wa.me/?text=${encodeURIComponent(t("share.whatsappText", { no, link }))}`} target="_blank" rel="noopener noreferrer" className={`${quietButton} w-full`}>
            <Icon name="share" size={18} />{t("share.whatsapp")}
          </a>
          <ActionForm action={unshareBiodataAction} tone="danger" submitLabel={t("share.off")} pendingLabel={t("share.offing")}>
            {() => <Hidden name="id" value={id} />}
          </ActionForm>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">{t("share.offText")}</p>
          <ActionForm action={shareBiodataAction} submitLabel={<><Icon name="link" size={18} />{t("share.create")}</>} pendingLabel={t("share.creating")}>
            {() => <Hidden name="id" value={id} />}
          </ActionForm>
        </>
      )}
    </Card>
  );
}

function CopyButton({ text }: { text: string }) {
  const { t } = useT();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* an old browser: the field beside selects itself on focus, so it can be copied by hand */
    }
  };
  return (
    <button type="button" onClick={copy} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-bold text-on-primary">
      <Icon name={done ? "check" : "copy"} size={16} />{done ? t("common.copied") : t("common.copy")}
    </button>
  );
}
