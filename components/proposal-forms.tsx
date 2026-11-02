"use client";

import { ActionForm, ConfirmCheck, Field, Hidden, Select, TextArea } from "@/components/form";
import { Icon } from "@/components/icons";
import type { ProfileStatus, ProposalStatus } from "@/lib/db/schema";
import { useT } from "@/lib/i18n/client";
import { addNoteAction, changeStatusAction, createProposalAction, deleteProposalAction, setFollowUpAction } from "@/lib/actions/proposals";
import { addEntryAction, deleteEntryAction } from "@/lib/actions/ledger";
import { addMeetingAction, deleteMeetingAction } from "@/lib/actions/meetings";
import { deleteProfileAction, setProfileStatusAction } from "@/lib/actions/profiles";

type Option = readonly [string, string];
const LEDGER_KINDS = ["chukti", "joma", "khoroch"] as const;
const PROFILE_STATUSES: ProfileStatus[] = ["active", "inactive", "engaged", "married"];

export function NewProposalForm({ patros, patris, patroId, patriId }: { patros: Option[]; patris: Option[]; patroId?: string; patriId?: string }) {
  const { t } = useT();
  return (
    <ActionForm action={createProposalAction} submitLabel={t("pp.propose")}>
      {(v) => (
        <>
          <Select name="patroId" label={t("kind.patro")} options={patros} placeholder={t("pr.pickPatro")} required defaultValue={v.patroId ?? patroId} />
          <Select name="patriId" label={t("kind.patri")} options={patris} placeholder={t("pr.pickPatri")} required defaultValue={v.patriId ?? patriId} />
          <TextArea name="note" label={t("pr.note")} placeholder={t("pr.notePlaceholder")} defaultValue={v.note} />
        </>
      )}
    </ActionForm>
  );
}

/** Move a proposal to one of the statuses allowed from where it is now. */
export function StatusForm({ id, next }: { id: string; next: ProposalStatus[] }) {
  const { t, options } = useT();
  if (!next.length) return null;
  return (
    <ActionForm action={changeStatusAction} submitLabel={t("pr.changeStatus")} tone="quiet" resetOnSuccess>
      {() => (
        <>
          <Hidden name="id" value={id} />
          <Select name="to" label={t("pr.newStatus")} options={options("proposalStatus", next)} placeholder={t("pr.pick")} required />
          <Field name="note" label={t("pr.withNote")} placeholder={t("pr.withNotePlaceholder")} />
        </>
      )}
    </ActionForm>
  );
}

export function NoteForm({ id }: { id: string }) {
  const { t } = useT();
  return (
    <ActionForm action={addNoteAction} submitLabel={t("pr.addNote")} tone="quiet" resetOnSuccess inline>
      {() => (
        <>
          <Hidden name="id" value={id} />
          <Field name="note" label={t("pr.writeNote")} placeholder={t("pr.writeNotePlaceholder")} required />
        </>
      )}
    </ActionForm>
  );
}

export function DeleteProposalForm({ id }: { id: string }) {
  const { t } = useT();
  return (
    <ActionForm action={deleteProposalAction} submitLabel={t("pr.delete")} tone="danger">
      {() => (
        <>
          <Hidden name="id" value={id} />
          <ConfirmCheck label={t("pr.deleteConfirm")} />
        </>
      )}
    </ActionForm>
  );
}

export function LedgerForm({ proposals, proposalId, today }: { proposals: Option[]; proposalId?: string; today: string }) {
  const { t, options } = useT();
  return (
    <ActionForm action={addEntryAction} submitLabel={t("lg.write")} resetOnSuccess>
      {(v) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Select name="kind" label={t("lg.kind")} options={options("ledgerKind", LEDGER_KINDS)} defaultValue={v.kind ?? "joma"} />
            <Field name="amount" label={t("lg.amount")} required type="number" inputMode="numeric" min="1" placeholder={t("lg.amountPlaceholder")} defaultValue={v.amount} />
          </div>
          <Field name="entryDate" label={t("lg.date")} type="date" defaultValue={v.entryDate ?? today} />
          {proposalId ? <Hidden name="proposalId" value={proposalId} /> : (
            <Select name="proposalId" label={t("lg.which")} options={proposals} placeholder={t("lg.general")} defaultValue={v.proposalId} />
          )}
          <Field name="note" label={t("lg.note")} placeholder={t("lg.notePlaceholder")} defaultValue={v.note} />
        </>
      )}
    </ActionForm>
  );
}

export function DeleteEntryButton({ id }: { id: string }) {
  const { t } = useT();
  return (
    <ActionForm action={deleteEntryAction} submitLabel={<Icon name="trash" size={18} />} submitAriaLabel={t("lg.deleteAria")} tone="quiet" inline compact>
      {() => <Hidden name="id" value={id} />}
    </ActionForm>
  );
}

export function ProfileStatusForm({ id, current }: { id: string; current: string }) {
  const { t, options } = useT();
  return (
    <ActionForm action={setProfileStatusAction} submitLabel={t("pp.changeStatus")} tone="quiet" inline>
      {() => (
        <>
          <Hidden name="id" value={id} />
          <Select name="status" label={t("pp.status")} options={options("profileStatus", PROFILE_STATUSES)} defaultValue={current} />
        </>
      )}
    </ActionForm>
  );
}

export function DeleteProfileForm({ id, kind }: { id: string; kind: string }) {
  const { t } = useT();
  return (
    <ActionForm action={deleteProfileAction} submitLabel={t("common.delete")} tone="danger">
      {() => (
        <>
          <Hidden name="id" value={id} />
          <Hidden name="kind" value={kind} />
          <ConfirmCheck label={t("pp.deleteConfirm")} />
        </>
      )}
    </ActionForm>
  );
}

/** The day to call the families again; it shows on the dashboard from that day on. */
export function FollowUpForm({ id, current, today }: { id: string; current: string | null; today: string }) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-2">
      <ActionForm action={setFollowUpAction} submitLabel={t("pr.followUpSave")} tone="quiet" inline>
        {(v) => (
          <>
            <Hidden name="id" value={id} />
            <Field name="followUpOn" label={t("pr.followUpOn")} type="date" min={today} required defaultValue={v.followUpOn ?? current ?? ""} />
          </>
        )}
      </ActionForm>
      {current ? (
        <ActionForm action={setFollowUpAction} submitLabel={t("pr.followUpClear")} tone="quiet" compact>
          {() => <><Hidden name="id" value={id} /><Hidden name="clear" value="on" /></>}
        </ActionForm>
      ) : null}
    </div>
  );
}

/** Set a দেখা-দেখি on this proposal: when (Dhaka time) and where. Both families get a notice. */
export function MeetingForm({ id, today }: { id: string; today: string }) {
  const { t } = useT();
  return (
    <ActionForm action={addMeetingAction} submitLabel={t("mt.add")} tone="quiet" resetOnSuccess>
      {(v) => (
        <>
          <Hidden name="id" value={id} />
          <Field name="at" label={t("mt.at")} type="datetime-local" min={`${today}T00:00`} required defaultValue={v.at ?? ""} />
          <Field name="place" label={t("mt.place")} placeholder={t("mt.placePlaceholder")} maxLength={200} defaultValue={v.place ?? ""} />
          <Field name="note" label={t("mt.note")} placeholder={t("mt.notePlaceholder")} maxLength={500} defaultValue={v.note ?? ""} />
        </>
      )}
    </ActionForm>
  );
}

export function DeleteMeetingForm({ id, proposalId }: { id: string; proposalId: string }) {
  const { t } = useT();
  return (
    <ActionForm action={deleteMeetingAction} submitLabel={t("mt.delete")} tone="quiet" compact inline>
      {() => <><Hidden name="id" value={id} /><Hidden name="proposalId" value={proposalId} /></>}
    </ActionForm>
  );
}
