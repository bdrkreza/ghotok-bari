"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../auth/session";
import { getDb } from "../db";
import type { ProfileStatus } from "../db/schema";
import { attempt, field, fieldValues, type FormState } from "../form";
import { getT } from "../i18n/server";
import { checkPhotos, photoChangeFrom, savePhotos, savePhotosForNew } from "../services/photos";
import { GHOTOK_REQUIRED, createProfile, deleteProfile, setApproval, setProfileStatus, setShowParents, setShowPhotos, updateProfile } from "../services/profiles";

export async function createProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const values = fieldValues(form);
  const photos = photoChangeFrom(form);
  return attempt(async () => {
    if (photos) await checkPhotos(photos);
    // "আলাদা মানুষ, তবুও যোগ করুন" posts anyway=on after the same-person warning
    const id = await createProfile(getDb(), user.ghotokId, values, undefined, { warnSame: field(form, "anyway") !== "on", require: GHOTOK_REQUIRED });
    if (photos) await savePhotosForNew(getDb(), user.ghotokId, id, photos);
    revalidatePath("/dashboard");
    redirect(`/profiles/${id}`);
  }, values);
}

export async function updateProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const values = fieldValues(form);
  const id = field(form, "id");
  const photos = photoChangeFrom(form);
  return attempt(async () => {
    if (photos) await checkPhotos(photos);
    await updateProfile(getDb(), user.ghotokId, id, values, { require: GHOTOK_REQUIRED });
    if (photos) await savePhotos(getDb(), user.ghotokId, id, photos);
    revalidatePath("/dashboard");
    redirect(`/profiles/${id}`);
  }, values);
}

export async function setProfileStatusAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const id = field(form, "id");
  return attempt(async () => {
    await setProfileStatus(getDb(), user.ghotokId, id, field(form, "status") as ProfileStatus);
    revalidatePath(`/profiles/${id}`);
    return { notice: t("notice.statusChanged") };
  });
}

/** Show or hide the parents' names (what=parents) or the photos (what=photos) to other families. */
export async function setVisibilityAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const id = field(form, "id");
  const show = field(form, "show") === "on";
  const photos = field(form, "what") === "photos";
  return attempt(async () => {
    await (photos ? setShowPhotos : setShowParents)(getDb(), user.ghotokId, id, show);
    revalidatePath(`/profiles/${id}`);
    if (photos) return { notice: show ? t("notice.photosShown") : t("notice.photosHidden") };
    return { notice: show ? t("notice.parentsShown") : t("notice.parentsHidden") };
  });
}

/** The ghotok's decision on a biodata a family handed in; the button pressed says which. */
export async function setApprovalAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const id = field(form, "id");
  const decision = field(form, "decision") === "returned" ? "returned" : "approved";
  return attempt(async () => {
    await setApproval(getDb(), user.ghotokId, id, decision, field(form, "note"));
    revalidatePath(`/profiles/${id}`);
    revalidatePath("/dashboard");
    return { notice: decision === "approved" ? t("notice.listed") : t("notice.returned") };
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
