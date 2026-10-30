"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "../auth";
import { getDb, usingDevDb } from "../db";
import { seedDemo } from "../demo";

/** Development only: create the demo ghotok with sample data and sign in as them. */
export async function seedDemoAction(): Promise<void> {
  if (process.env.NODE_ENV === "production" || !usingDevDb()) redirect("/login");
  // either way the browser is now signed in as the demo ghotok
  await seedDemo(getDb(), getAuth(), await headers());
  redirect("/");
}
