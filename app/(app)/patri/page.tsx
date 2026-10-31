import type { Metadata } from "next";
import { ProfileList } from "@/components/profile-list";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("kind.patri") };
}

/** Both roles: the ghotok sees every bride in full, a family the approved ones without names or contacts. */
export default async function PatriPage(props: PageProps<"/patri">) {
  const user = await requireUser();
  return <ProfileList kind="patri" query={await props.searchParams} viewer={user.role === "admin" ? "admin" : "customer"} />;
}
