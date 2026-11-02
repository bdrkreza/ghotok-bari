"use client";

import { ActionForm, Hidden } from "@/components/form";
import { resetPasswordAction, setRoleAction } from "@/lib/actions/customers";
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

/** A family forgot their password: a new one is made and shown here once, for the ghotok to read out to them. */
export function ResetPasswordForm({ id }: { id: string }) {
  const { t } = useT();
  return (
    <div className="lg:w-40">
      <ActionForm action={resetPasswordAction} compact tone="quiet" submitLabel={t("cu.resetPassword")} pendingLabel="…">
        {() => <Hidden name="id" value={id} />}
      </ActionForm>
    </div>
  );
}
