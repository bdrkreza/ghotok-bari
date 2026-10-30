import { requireAdmin } from "@/lib/auth/session";

/** The ghotok's side: dashboard, people, proposals, ledger, accounts. A customer who types one of these addresses
 *  is sent to their own page; the pages inside call requireAdmin() again to get the id their reads are scoped to. */
export default async function GhotokLayout({ children }: LayoutProps<"/">) {
  await requireAdmin();
  return <>{children}</>;
}
