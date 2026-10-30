import type { Metadata } from "next";
import { ProfileList } from "@/components/profile-list";

export const metadata: Metadata = { title: "পাত্রী" };

export default async function PatriPage(props: PageProps<"/patri">) {
  return <ProfileList kind="patri" query={await props.searchParams} />;
}
