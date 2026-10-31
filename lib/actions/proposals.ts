"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../auth/session";
import { getDb } from "../db";
import type { ProposalStatus } from "../db/schema";
import { attempt, field, fieldValues, type FormState } from "../form";
import { getT } from "../i18n/server";
import { addNote, changeStatus, createProposal, deleteProposal } from "../services/proposals";

export async function createProposalAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const values = fieldValues(form);
  return attempt(async () => {
    const id = await createProposal(getDb(), user.ghotokId, {
      patroId: field(form, "patroId"), patriId: field(form, "patriId"), note: field(form, "note"),
    });
    revalidatePath("/dashboard");
    redirect(`/proposals/${id}`);
  }, values);
}

export async function changeStatusAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const id = field(form, "id");
  return attempt(async () => {
    await changeStatus(getDb(), user.ghotokId, id, field(form, "to") as ProposalStatus, field(form, "note"));
    revalidatePath("/dashboard");
    revalidatePath(`/proposals/${id}`);
    return { notice: t("notice.statusChanged") };
  });
}

export async function addNoteAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const id = field(form, "id");
  return attempt(async () => {
    await addNote(getDb(), user.ghotokId, id, field(form, "note"));
    revalidatePath(`/proposals/${id}`);
    return { notice: t("notice.noteAdded") };
  });
}

export async function deleteProposalAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  return attempt(async () => {
    await deleteProposal(getDb(), user.ghotokId, field(form, "id"));
    revalidatePath("/dashboard");
    redirect("/proposals");
  });
}
