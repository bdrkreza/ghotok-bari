import { requireAdmin } from "@/lib/auth/session";

/** Everything under /admin is for the admin role only; a ghotok who types the address is sent to their own dashboard. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return <>{children}</>;
}
