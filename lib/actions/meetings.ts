"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../auth/session";
import { getDb } from "../db";
import { attempt, field, fieldValues, type FormState } from "../form";
import { getT } from "../i18n/server";
import { addMeeting, deleteMeeting } from "../services/meetings";
import { audit, pairName } from "./audit";

// দেখা-দেখি: set from a proposal's page, listed on /dashboard/meetings.

export async function addMeetingAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const id = field(form, "id");
  return attempt(async () => {
    await addMeeting(getDb(), user.ghotokId, id, { at: field(form, "at"), place: field(form, "place"), note: field(form, "note") });
    await audit(user, "meetingAdded", await pairName(user, id), `/proposals/${id}`);
    revalidatePath(`/proposals/${id}`);
    revalidatePath("/dashboard", "layout");
    return { notice: t("notice.meetingSet") };
  }, fieldValues(form));
}

export async function deleteMeetingAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const proposalId = field(form, "proposalId");
  return attempt(async () => {
    await deleteMeeting(getDb(), user.ghotokId, field(form, "id"));
    await audit(user, "meetingDeleted", await pairName(user, proposalId), `/proposals/${proposalId}`);
    revalidatePath(`/proposals/${proposalId}`);
    revalidatePath("/dashboard", "layout");
    return { notice: t("notice.meetingDeleted") };
  });
}
