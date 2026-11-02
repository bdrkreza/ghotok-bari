"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../auth/session";
import { getDb } from "../db";
import { attempt, field, fieldValues, type FormState } from "../form";
import { getT } from "../i18n/server";
import { audit } from "./audit";
import { addEntry, deleteEntry } from "../services/ledger";

export async function addEntryAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const values = fieldValues(form);
  return attempt(async () => {
    await addEntry(getDb(), user.ghotokId, values);
    await audit(user, "ledgerAdded", values.amount ? `৳${values.amount}` : null, "/hisab");
    revalidatePath("/dashboard");
    revalidatePath("/hisab");
    if (values.proposalId) revalidatePath(`/proposals/${values.proposalId}`);
    return { notice: t("notice.ledgerAdded") };
  }, values);
}

export async function deleteEntryAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  return attempt(async () => {
    await deleteEntry(getDb(), user.ghotokId, field(form, "id"));
    await audit(user, "ledgerDeleted", null, "/hisab");
    revalidatePath("/dashboard");
    revalidatePath("/hisab");
    return { notice: t("notice.deleted") };
  });
}
