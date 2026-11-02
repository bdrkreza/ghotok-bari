"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../auth/session";
import { getDb } from "../db";
import type { ProposalStatus } from "../db/schema";
import { attempt, field, fieldValues, type FormState } from "../form";
import { getT } from "../i18n/server";
import { audit, pairName } from "./audit";
import { addNote, changeStatus, createProposal, deleteProposal, setFollowUp } from "../services/proposals";

export async function createProposalAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const values = fieldValues(form);
  return attempt(async () => {
    const id = await createProposal(getDb(), user.ghotokId, {
      patroId: field(form, "patroId"), patriId: field(form, "patriId"), note: field(form, "note"),
    });
    await audit(user, "proposalAdded", await pairName(user, id), `/proposals/${id}`);
    revalidatePath("/dashboard");
    redirect(`/proposals/${id}`);
  }, values);
}

export async function changeStatusAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const id = field(form, "id");
  return attempt(async () => {
    await changeStatus(getDb(), user.ghotokId, id, field(form, "to") as ProposalStatus, field(form, "note"));
    await audit(user, "proposalStatus", await pairName(user, id), `/proposals/${id}`);
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
    await audit(user, "proposalNote", await pairName(user, id), `/proposals/${id}`);
    revalidatePath(`/proposals/${id}`);
    return { notice: t("notice.noteAdded") };
  });
}

export async function deleteProposalAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  return attempt(async () => {
    const id = field(form, "id");
    const name = await pairName(user, id);
    await deleteProposal(getDb(), user.ghotokId, id);
    await audit(user, "proposalDeleted", name);
    revalidatePath("/dashboard");
    redirect("/proposals");
  });
}

/** The day to call the families again; "clear" removes it. */
export async function setFollowUpAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const id = field(form, "id");
  const on = field(form, "clear") === "on" ? "" : field(form, "followUpOn");
  return attempt(async () => {
    await setFollowUp(getDb(), user.ghotokId, id, on);
    await audit(user, "followUp", await pairName(user, id), `/proposals/${id}`);
    revalidatePath("/dashboard");
    revalidatePath(`/proposals/${id}`);
    return { notice: on ? t("notice.followUpSet") : t("notice.followUpCleared") };
  });
}
