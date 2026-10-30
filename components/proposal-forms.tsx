"use client";

import { ActionForm, ConfirmCheck, Field, Hidden, Select, TextArea } from "@/components/form";
import { Icon } from "@/components/icons";
import { LEDGER_KIND, PROPOSAL_STATUS, options } from "@/lib/bn";
import type { ProposalStatus } from "@/lib/db/schema";
import { addNoteAction, changeStatusAction, createProposalAction, deleteProposalAction } from "@/lib/actions/proposals";
import { addEntryAction, deleteEntryAction } from "@/lib/actions/ledger";
import { deleteProfileAction, setProfileStatusAction } from "@/lib/actions/profiles";

type Option = readonly [string, string];

export function NewProposalForm({ patros, patris, patroId, patriId }: { patros: Option[]; patris: Option[]; patroId?: string; patriId?: string }) {
  return (
    <ActionForm action={createProposalAction} submitLabel="প্রস্তাব দিন">
      {(v) => (
        <>
          <Select name="patroId" label="পাত্র" options={patros} placeholder="পাত্র বেছে নিন" required defaultValue={v.patroId ?? patroId} />
          <Select name="patriId" label="পাত্রী" options={patris} placeholder="পাত্রী বেছে নিন" required defaultValue={v.patriId ?? patriId} />
          <TextArea name="note" label="নোট" placeholder="কে প্রস্তাব দিল, কবে কথা হবে…" defaultValue={v.note} />
        </>
      )}
    </ActionForm>
  );
}

/** Move a proposal to one of the statuses allowed from where it is now. */
export function StatusForm({ id, next }: { id: string; next: ProposalStatus[] }) {
  if (!next.length) return null;
  const opts = next.map((s) => [s, PROPOSAL_STATUS[s].label] as const);
  return (
    <ActionForm action={changeStatusAction} submitLabel="অবস্থা বদলান" tone="quiet" resetOnSuccess>
      {() => (
        <>
          <Hidden name="id" value={id} />
          <Select name="to" label="নতুন অবস্থা" options={opts} placeholder="বেছে নিন" required />
          <Field name="note" label="সাথে একটা নোট" placeholder="যেমন: শুক্রবার দেখতে যাবে" />
        </>
      )}
    </ActionForm>
  );
}

export function NoteForm({ id }: { id: string }) {
  return (
    <ActionForm action={addNoteAction} submitLabel="যোগ করুন" tone="quiet" resetOnSuccess inline>
      {() => (
        <>
          <Hidden name="id" value={id} />
          <Field name="note" label="নোট লিখুন" placeholder="আজ কী কথা হলো…" required />
        </>
      )}
    </ActionForm>
  );
}

export function DeleteProposalForm({ id }: { id: string }) {
  return (
    <ActionForm action={deleteProposalAction} submitLabel="প্রস্তাব মুছে ফেলুন" tone="danger">
      {() => (
        <>
          <Hidden name="id" value={id} />
          <ConfirmCheck label="হ্যাঁ, এই প্রস্তাব আর তার সব নোট মুছে যাবে।" />
        </>
      )}
    </ActionForm>
  );
}

export function LedgerForm({ proposals, proposalId, today }: { proposals: Option[]; proposalId?: string; today: string }) {
  return (
    <ActionForm action={addEntryAction} submitLabel="হিসাবে লিখুন" resetOnSuccess>
      {(v) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Select name="kind" label="ধরন" options={options(LEDGER_KIND)} defaultValue={v.kind ?? "joma"} />
            <Field name="amount" label="টাকা" required type="number" inputMode="numeric" min="1" placeholder="যেমন ৫০০০" defaultValue={v.amount} />
          </div>
          <Field name="entryDate" label="তারিখ" type="date" defaultValue={v.entryDate ?? today} />
          {proposalId ? <Hidden name="proposalId" value={proposalId} /> : (
            <Select name="proposalId" label="কোন বিয়ের" options={proposals} placeholder="সাধারণ (কোনো বিয়ের সাথে নয়)" defaultValue={v.proposalId} />
          )}
          <Field name="note" label="নোট" placeholder="যেমন: পাত্রপক্ষ থেকে অগ্রিম" defaultValue={v.note} />
        </>
      )}
    </ActionForm>
  );
}

export function DeleteEntryButton({ id }: { id: string }) {
  return (
    <ActionForm action={deleteEntryAction} submitLabel={<Icon name="trash" size={18} />} submitAriaLabel="এই লেখা মুছুন" tone="quiet" inline compact>
      {() => <Hidden name="id" value={id} />}
    </ActionForm>
  );
}

export function ProfileStatusForm({ id, current }: { id: string; current: string }) {
  const opts: Option[] = [["active", "খোঁজ চলছে"], ["inactive", "বন্ধ"], ["engaged", "বিয়ে ঠিক"], ["married", "বিয়ে হয়েছে"]];
  return (
    <ActionForm action={setProfileStatusAction} submitLabel="বদলান" tone="quiet" inline>
      {() => (
        <>
          <Hidden name="id" value={id} />
          <Select name="status" label="অবস্থা" options={opts} defaultValue={current} />
        </>
      )}
    </ActionForm>
  );
}

export function DeleteProfileForm({ id, kind }: { id: string; kind: string }) {
  return (
    <ActionForm action={deleteProfileAction} submitLabel="মুছে ফেলুন" tone="danger">
      {() => (
        <>
          <Hidden name="id" value={id} />
          <Hidden name="kind" value={kind} />
          <ConfirmCheck label="হ্যাঁ, এই ব্যক্তি আর তার সব প্রস্তাব মুছে যাবে।" />
        </>
      )}
    </ActionForm>
  );
}
