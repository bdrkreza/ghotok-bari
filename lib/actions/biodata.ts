"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCustomer } from "../auth/session";
import { getDb } from "../db";
import { attempt, field, fieldValues, type FormState } from "../form";
import { deleteMyBiodata, submitBiodata, updateMyBiodata } from "../services/biodata";

// A family's own biodata. Each action is scoped to the signed-in customer and the site's ghotok.

export async function submitBiodataAction(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireCustomer();
  const values = fieldValues(form);
  return attempt(async () => {
    const id = await submitBiodata(getDb(), me.ghotokId, me.id, values);
    revalidatePath("/me");
    revalidatePath("/dashboard");
    redirect(`/me/biodata/${id}`);
  }, values);
}

export async function updateBiodataAction(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireCustomer();
  const values = fieldValues(form);
  const id = field(form, "id");
  return attempt(async () => {
    await updateMyBiodata(getDb(), me.ghotokId, me.id, id, values);
    revalidatePath("/me");
    revalidatePath("/dashboard");
    redirect(`/me/biodata/${id}`);
  }, values);
}

export async function deleteBiodataAction(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireCustomer();
  return attempt(async () => {
    await deleteMyBiodata(getDb(), me.ghotokId, me.id, field(form, "id"));
    revalidatePath("/me");
    revalidatePath("/dashboard");
    redirect("/me");
  });
}
