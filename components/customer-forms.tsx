"use client";

import { ActionForm, Hidden } from "./form";
import { setRoleAction } from "@/lib/actions/customers";
import { useT } from "@/lib/i18n/client";

/** One button per account on /dashboard/customers: make them an admin (a helper of the ghotok's), or take it back. */
export function RoleForm({ id, admin }: { id: string; admin: boolean }) {
  const { t } = useT();
  return (
    <div className="lg:w-40">
      <ActionForm action={setRoleAction} compact tone={admin ? "danger" : "quiet"} submitLabel={admin ? t("cu.removeAdmin") : t("cu.makeAdmin")} pendingLabel="…">
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
