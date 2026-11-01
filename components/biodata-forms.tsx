"use client";

import { ActionForm, ConfirmCheck, Hidden, TextArea } from "./form";
import { deleteBiodataAction } from "@/lib/actions/biodata";
import { setApprovalAction, setVisibilityAction } from "@/lib/actions/profiles";
import type { Approval } from "@/lib/db/schema";
import { useT } from "@/lib/i18n/client";

/** One button that flips whether other families see the parents' names or the photos. */
export function VisibilityForm({ id, what, shown }: { id: string; what: "parents" | "photos"; shown: boolean }) {
  const { t } = useT();
  const label = what === "photos" ? (shown ? t("pp.photosHide") : t("pp.photosShow")) : (shown ? t("pp.parentsHide") : t("pp.parentsShow"));
  return (
    <ActionForm action={setVisibilityAction} submitLabel={label} tone="quiet">
      {() => (
        <>
          <Hidden name="id" value={id} />
          <Hidden name="what" value={what} />
          <Hidden name="show" value={shown ? "" : "on"} />
        </>
      )}
    </ActionForm>
  );
}

/** The ghotok's two buttons on a biodata a family handed in: list it, or send it back with a note. */
export function ApprovalForm({ id, current }: { id: string; current: Approval }) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-4">
      {current !== "approved" ? (
        <ActionForm action={setApprovalAction} submitLabel={t("ap.list")} pendingLabel={t("ap.listing")}>
          {() => (
            <>
              <Hidden name="id" value={id} />
              <Hidden name="decision" value="approved" />
            </>
          )}
        </ActionForm>
      ) : null}
      <ActionForm action={setApprovalAction} submitLabel={current === "approved" ? t("ap.returnListed") : t("ap.return")} tone="danger">
        {(v) => (
          <>
            <Hidden name="id" value={id} />
            <Hidden name="decision" value="returned" />
            <TextArea name="note" label={t("ap.noteLabel")} placeholder={t("ap.notePlaceholder")} defaultValue={v.note} rows={2} />
          </>
        )}
      </ActionForm>
    </div>
  );
}

/** A family takes back a biodata the ghotok has not listed yet. */
export function DeleteBiodataForm({ id }: { id: string }) {
  const { t } = useT();
  return (
    <ActionForm action={deleteBiodataAction} submitLabel={t("common.delete")} tone="danger">
      {() => (
        <>
          <Hidden name="id" value={id} />
          <ConfirmCheck label={t("mb.deleteConfirm")} />
        </>
      )}
    </ActionForm>
  );
}
