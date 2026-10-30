"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth/session";
import { getDb } from "../db";
import { attempt, field, type FormState } from "../form";
import { shareBiodata, unshareBiodata } from "../services/share";

export async function shareBiodataAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = field(form, "id");
  return attempt(async () => {
    await shareBiodata(getDb(), user.id, id);
    revalidatePath(`/profiles/${id}`);
    return { notice: "শেয়ার লিংক তৈরি হয়েছে।" };
  });
}

export async function unshareBiodataAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = field(form, "id");
  return attempt(async () => {
    await unshareBiodata(getDb(), user.id, id);
    revalidatePath(`/profiles/${id}`);
    return { notice: "লিংক বন্ধ করা হয়েছে। পুরনো লিংকে আর কিছু দেখা যাবে না।" };
  });
}
