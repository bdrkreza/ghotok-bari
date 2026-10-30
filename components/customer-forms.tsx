"use client";

import { ActionForm, Hidden } from "./form";
import { setRoleAction } from "@/lib/actions/customers";

/** One button per account on /dashboard/customers: make them an admin (a helper of the ghotok's), or take it back. */
export function RoleForm({ id, admin }: { id: string; admin: boolean }) {
  return (
    <div className="lg:w-40">
      <ActionForm action={setRoleAction} compact tone={admin ? "danger" : "quiet"} submitLabel={admin ? "অ্যাডমিন সরান" : "অ্যাডমিন করুন"} pendingLabel="…">
        {() => (
          <>
            <Hidden name="id" value={id} />
            <Hidden name="role" value={admin ? "customer" : "admin"} />
          </>
        )}
      </ActionForm>
    </div>
  );
}
