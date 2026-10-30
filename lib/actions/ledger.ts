"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth/session";
import { getDb } from "../db";
import { attempt, field, fieldValues, type FormState } from "../form";
import { addEntry, deleteEntry } from "../services/ledger";

export async function addEntryAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = fieldValues(form);
  return attempt(async () => {
    await addEntry(getDb(), user.id, values);
    revalidatePath("/");
    revalidatePath("/hisab");
    if (values.proposalId) revalidatePath(`/proposals/${values.proposalId}`);
    return { notice: "হিসাবে লেখা হয়েছে।" };
  }, values);
}

export async function deleteEntryAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  return attempt(async () => {
    await deleteEntry(getDb(), user.id, field(form, "id"));
    revalidatePath("/");
    revalidatePath("/hisab");
    return { notice: "মুছে ফেলা হয়েছে।" };
  });
}
