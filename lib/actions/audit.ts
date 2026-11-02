import type { AdminSession } from "../auth/session";
import { getDb } from "../db";
import { logActivity, type ActivityAction } from "../services/activity";
import { getProfile } from "../services/profiles";
import { getProposal } from "../services/proposals";

// Helpers for the ghotok's actions: write the activity log (/dashboard/activity) once a change has gone through.
// Not a server action file; imported by the ones in this folder.

export async function audit(user: AdminSession, action: ActivityAction, label: string | null = null, href: string | null = null): Promise<void> {
  await logActivity(getDb(), user.ghotokId, user.id, action, label, href);
}

/** A person's name for the log, or null when they are not found (the change itself will say so). */
export async function personName(user: AdminSession, id: string): Promise<string | null> {
  return getProfile(getDb(), user.ghotokId, id).then((p) => p.name, () => null);
}

/** "A ও B" for a proposal, or null. */
export async function pairName(user: AdminSession, id: string): Promise<string | null> {
  return getProposal(getDb(), user.ghotokId, id).then((p) => `${p.patro.name} ও ${p.patri.name}`, () => null);
}
