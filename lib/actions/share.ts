"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../auth/session";
import { getDb } from "../db";
import { attempt, field, type FormState } from "../form";
import { getT } from "../i18n/server";
import { shareBiodata, unshareBiodata } from "../services/share";

export async function shareBiodataAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const id = field(form, "id");
  return attempt(async () => {
    await shareBiodata(getDb(), user.ghotokId, id);
    revalidatePath(`/profiles/${id}`);
    return { notice: t("notice.shareOn") };
  });
}

export async function unshareBiodataAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const id = field(form, "id");
  return attempt(async () => {
    await unshareBiodata(getDb(), user.ghotokId, id);
    revalidatePath(`/profiles/${id}`);
    return { notice: t("notice.shareOff") };
  });
}
