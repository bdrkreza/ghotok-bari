"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../auth/session";
import { getDb } from "../db";
import { attempt, fieldValues, type FormState } from "../form";
import { getT } from "../i18n/server";
import { updateSite } from "../services/site";
import { audit } from "./audit";

/** The front page's words and the ghotok's contact details, from /dashboard/site. */
export async function updateSiteAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, { t }] = await Promise.all([requireAdmin(), getT()]);
  const values = fieldValues(form);
  return attempt(async () => {
    await updateSite(getDb(), user.ghotokId, values);
    await audit(user, "siteEdited", values.name, "/");
    // the name is in every bar, the words on the front page
    revalidatePath("/", "layout");
    return { notice: t("notice.siteSaved") };
  }, values);
}
