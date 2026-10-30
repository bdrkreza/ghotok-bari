import { requireCustomer } from "@/lib/auth/session";

/** The family's side (/me). The ghotok and other admins are sent to the dashboard instead. */
export default async function CustomerLayout({ children }: LayoutProps<"/">) {
  await requireCustomer();
  return <>{children}</>;
}
