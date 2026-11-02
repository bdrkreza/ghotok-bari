"use server";

import { requireSite, requireUser } from "../auth/session";
import { getDb } from "../db";
import { pushTo, removePushSubscription, savePushSubscription } from "../services/push";

// Settings' "ফোনে খবর" card: the browser subscribes itself (components in settings), then hands its address here.

export async function savePushAction(endpoint: string): Promise<void> {
  const [user, site] = await Promise.all([requireUser(), requireSite()]);
  await savePushSubscription(getDb(), site.ghotokId, user.id, String(endpoint));
}

export async function removePushAction(endpoint: string): Promise<void> {
  const [user, site] = await Promise.all([requireUser(), requireSite()]);
  await removePushSubscription(getDb(), site.ghotokId, user.id, String(endpoint));
}

/** "পরীক্ষা পাঠান": wakes this account's own browsers, so they can see it works. */
export async function testPushAction(): Promise<void> {
  const [user, site] = await Promise.all([requireUser(), requireSite()]);
  await pushTo(getDb(), site.ghotokId, [user.id]);
}
