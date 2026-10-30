"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth/session";
import { getDb } from "../db";
import type { ProposalStatus } from "../db/schema";
import { attempt, field, fieldValues, type FormState } from "../form";
import { addNote, changeStatus, createProposal, deleteProposal } from "../services/proposals";

export async function createProposalAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = fieldValues(form);
  return attempt(async () => {
    const id = await createProposal(getDb(), user.id, {
      patroId: field(form, "patroId"), patriId: field(form, "patriId"), note: field(form, "note"),
    });
    revalidatePath("/");
    redirect(`/proposals/${id}`);
  }, values);
}

export async function changeStatusAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = field(form, "id");
  return attempt(async () => {
    await changeStatus(getDb(), user.id, id, field(form, "to") as ProposalStatus, field(form, "note"));
    revalidatePath("/");
    revalidatePath(`/proposals/${id}`);
    return { notice: "অবস্থা বদলানো হয়েছে।" };
  });
}

export async function addNoteAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = field(form, "id");
  return attempt(async () => {
    await addNote(getDb(), user.id, id, field(form, "note"));
    revalidatePath(`/proposals/${id}`);
    return { notice: "নোট যোগ হয়েছে।" };
  });
}

export async function deleteProposalAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  return attempt(async () => {
    await deleteProposal(getDb(), user.id, field(form, "id"));
    revalidatePath("/");
    redirect("/proposals");
  });
}
