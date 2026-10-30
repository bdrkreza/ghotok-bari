import type { Metadata } from "next";
import { ProfileList } from "@/components/profile-list";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "পাত্রী" };

/** Both roles: the ghotok sees every bride in full, a family the approved ones without names or contacts. */
export default async function PatriPage(props: PageProps<"/patri">) {
  const user = await requireUser();
  return <ProfileList kind="patri" query={await props.searchParams} viewer={user.role === "admin" ? "admin" : "customer"} />;
}
