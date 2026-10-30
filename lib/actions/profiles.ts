"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../auth/session";
import { getDb } from "../db";
import type { ProfileStatus } from "../db/schema";
import { attempt, field, fieldValues, type FormState } from "../form";
import { createProfile, deleteProfile, setApproval, setProfileStatus, updateProfile } from "../services/profiles";

export async function createProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const values = fieldValues(form);
  return attempt(async () => {
    const id = await createProfile(getDb(), user.ghotokId, values);
    revalidatePath("/dashboard");
    redirect(`/profiles/${id}`);
  }, values);
}

export async function updateProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const values = fieldValues(form);
  const id = field(form, "id");
  return attempt(async () => {
    await updateProfile(getDb(), user.ghotokId, id, values);
    revalidatePath("/dashboard");
    redirect(`/profiles/${id}`);
  }, values);
}

export async function setProfileStatusAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const id = field(form, "id");
  return attempt(async () => {
    await setProfileStatus(getDb(), user.ghotokId, id, field(form, "status") as ProfileStatus);
    revalidatePath(`/profiles/${id}`);
    return { notice: "অবস্থা বদলানো হয়েছে।" };
  });
}

/** The ghotok's decision on a biodata a family handed in; the button pressed says which. */
export async function setApprovalAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const id = field(form, "id");
  const decision = field(form, "decision") === "returned" ? "returned" : "approved";
  return attempt(async () => {
    await setApproval(getDb(), user.ghotokId, id, decision, field(form, "note"));
    revalidatePath(`/profiles/${id}`);
    revalidatePath("/dashboard");
    return { notice: decision === "approved" ? "তালিকায় তোলা হয়েছে।" : "পরিবারকে ফেরত পাঠানো হয়েছে।" };
  });
}

export async function deleteProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const id = field(form, "id");
  return attempt(async () => {
    const kind = field(form, "kind") === "patri" ? "patri" : "patro";
    await deleteProfile(getDb(), user.ghotokId, id);
    revalidatePath("/dashboard");
    redirect(`/${kind}`);
  });
}
