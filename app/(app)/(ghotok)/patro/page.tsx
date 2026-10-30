import type { Metadata } from "next";
import { ProfileList } from "@/components/profile-list";

export const metadata: Metadata = { title: "পাত্র" };

export default async function PatroPage(props: PageProps<"/patro">) {
  return <ProfileList kind="patro" query={await props.searchParams} />;
}
