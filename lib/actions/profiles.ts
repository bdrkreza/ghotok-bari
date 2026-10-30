"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth/session";
import { getDb } from "../db";
import type { ProfileStatus } from "../db/schema";
import { attempt, field, fieldValues, type FormState } from "../form";
import { createProfile, deleteProfile, setProfileStatus, updateProfile } from "../services/profiles";

export async function createProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = fieldValues(form);
  return attempt(async () => {
    const id = await createProfile(getDb(), user.id, values);
    revalidatePath("/");
    redirect(`/profiles/${id}`);
  }, values);
}

export async function updateProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = fieldValues(form);
  const id = field(form, "id");
  return attempt(async () => {
    await updateProfile(getDb(), user.id, id, values);
    revalidatePath("/");
    redirect(`/profiles/${id}`);
  }, values);
}

export async function setProfileStatusAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = field(form, "id");
  return attempt(async () => {
    await setProfileStatus(getDb(), user.id, id, field(form, "status") as ProfileStatus);
    revalidatePath(`/profiles/${id}`);
    return { notice: "অবস্থা বদলানো হয়েছে।" };
  });
}

export async function deleteProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = field(form, "id");
  return attempt(async () => {
    const kind = field(form, "kind") === "patri" ? "patri" : "patro";
    await deleteProfile(getDb(), user.id, id);
    revalidatePath("/");
    redirect(`/${kind}`);
  });
}
