"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../auth/session";
import { getDb } from "../db";
import { attempt, field, type FormState } from "../form";
import { getT } from "../i18n/server";
import { accountName, resetPassword, setRole } from "../services/customers";
import { audit } from "./audit";

export async function setRoleAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [admin, { t }] = await Promise.all([requireAdmin(), getT()]);
  const id = field(form, "id");
  const role = field(form, "role") === "admin" ? "admin" : "customer";
  return attempt(async () => {
    await setRole(getDb(), admin, id, role);
    await audit(admin, "roleChanged", await accountName(getDb(), admin, id), "/dashboard/customers");
    revalidatePath("/dashboard/customers");
    return { notice: role === "admin" ? t("notice.madeAdmin") : t("notice.removedAdmin") };
  });
}

/**
 * A family forgot their password: make a new one and show it to the ghotok once, to read out over the phone. The
 * digits stay Latin in either language, since that is what the family types.
 */
export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const [admin, { t }] = await Promise.all([requireAdmin(), getT()]);
  const id = field(form, "id");
  return attempt(async () => {
    const password = await resetPassword(getDb(), admin, id);
    await audit(admin, "passwordReset", await accountName(getDb(), admin, id), "/dashboard/customers");
    return { notice: t("notice.passwordReset", { password }) };
  });
}
