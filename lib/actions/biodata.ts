"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCustomer } from "../auth/session";
import { getDb } from "../db";
import { attempt, field, fieldValues, type FormState } from "../form";
import { deleteMyBiodata, submitBiodata, updateMyBiodata } from "../services/biodata";
import { checkPhotos, photoChangeFrom, savePhotos, savePhotosForNew } from "../services/photos";

// A family's own biodata. Each action is scoped to the signed-in customer and the site's ghotok.

export async function submitBiodataAction(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireCustomer();
  const values = fieldValues(form);
  const photos = photoChangeFrom(form);
  return attempt(async () => {
    if (photos) await checkPhotos(photos);
    const id = await submitBiodata(getDb(), me.ghotokId, me.id, values);
    if (photos) await savePhotosForNew(getDb(), me.ghotokId, id, photos);
    revalidatePath("/me");
    revalidatePath("/dashboard");
    redirect(`/me/biodata/${id}`);
  }, values);
}

export async function updateBiodataAction(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireCustomer();
  const values = fieldValues(form);
  const id = field(form, "id");
  const photos = photoChangeFrom(form);
  return attempt(async () => {
    if (photos) await checkPhotos(photos);
    // updateMyBiodata checks the biodata is this family's before the photos are touched
    await updateMyBiodata(getDb(), me.ghotokId, me.id, id, values);
    if (photos) await savePhotos(getDb(), me.ghotokId, id, photos);
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
