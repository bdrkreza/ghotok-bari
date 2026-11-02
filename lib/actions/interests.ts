"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireCustomer } from "../auth/session";
import { getDb } from "../db";
import { attempt, field, type FormState } from "../form";
import { getT } from "../i18n/server";
import { expressInterest, proposeFromInterest, setInterestStatus, toggleFavorite, withdrawInterest } from "../services/interests";
import { dismissNotice } from "../services/notices";
import { audit } from "./audit";

// "আগ্রহ জানান", the short list and the notices: the family's side, then the ghotok's inbox.

export async function expressInterestAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [me, { t }] = await Promise.all([requireCustomer(), getT()]);
  const id = field(form, "id");
  return attempt(async () => {
    await expressInterest(getDb(), me.ghotokId, me.id, { profileId: id, forProfileId: field(form, "forProfileId"), note: field(form, "note") });
    revalidatePath(`/biodata/${id}`);
    revalidatePath("/me");
    revalidatePath("/dashboard");
    return { notice: t("notice.interestSent") };
  });
}

export async function withdrawInterestAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [me, { t }] = await Promise.all([requireCustomer(), getT()]);
  const id = field(form, "id");
  return attempt(async () => {
    await withdrawInterest(getDb(), me.ghotokId, me.id, id);
    revalidatePath(`/biodata/${id}`);
    revalidatePath("/me");
    return { notice: t("notice.interestWithdrawn") };
  });
}

export async function toggleFavoriteAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [me, { t }] = await Promise.all([requireCustomer(), getT()]);
  const id = field(form, "id");
  return attempt(async () => {
    const on = await toggleFavorite(getDb(), me.ghotokId, me.id, id);
    revalidatePath(`/biodata/${id}`);
    revalidatePath("/me");
    return { notice: on ? t("notice.favoriteOn") : t("notice.favoriteOff") };
  });
}

/** Dismiss one notice on /me, or every one when no id is sent. */
export async function dismissNoticeAction(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireCustomer();
  return attempt(async () => {
    await dismissNotice(getDb(), me.ghotokId, me.id, field(form, "id"));
    revalidatePath("/me");
  });
}

/** The ghotok makes a proposal from a request, and opens it. */
export async function proposeFromInterestAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  return attempt(async () => {
    const id = await proposeFromInterest(getDb(), user.ghotokId, field(form, "id"));
    await audit(user, "interestProposed", null, `/proposals/${id}`);
    revalidatePath("/dashboard");
    redirect(`/proposals/${id}`);
  });
}

/** Close a request without a proposal here, or open it again (status=new). */
export async function setInterestStatusAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const status = field(form, "status") === "new" ? "new" : "closed";
  return attempt(async () => {
    await setInterestStatus(getDb(), user.ghotokId, field(form, "id"), status);
    if (status === "closed") await audit(user, "interestClosed", null, "/dashboard/interests");
    revalidatePath("/dashboard/interests");
    revalidatePath("/dashboard");
    return { notice: status === "closed" ? t("notice.interestClosed") : t("notice.interestReopened") };
  });
}
