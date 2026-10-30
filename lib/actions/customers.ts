"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../auth/session";
import { getDb } from "../db";
import { attempt, field, type FormState } from "../form";
import { setRole } from "../services/customers";

export async function setRoleAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = field(form, "id");
  const role = field(form, "role") === "admin" ? "admin" : "customer";
  return attempt(async () => {
    await setRole(getDb(), admin, id, role);
    revalidatePath("/dashboard/customers");
    return { notice: role === "admin" ? "অ্যাডমিন করা হয়েছে।" : "অ্যাডমিন থেকে সরানো হয়েছে।" };
  });
}
