"use client";

import { ActionForm, Field } from "@/components/form";
import { changePasswordAction } from "@/lib/auth/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/phone";
import { useT } from "@/lib/i18n/client";

/** Change one's own password: the current one, then the new. Other phones and computers are signed out. */
export function PasswordForm() {
  const { t } = useT();
  return (
    <ActionForm action={changePasswordAction} tone="quiet" submitLabel={t("st.changePassword")} resetOnSuccess>
      {() => (
        <>
          <Field name="current" id="current-password" label={t("st.currentPassword")} type="password" autoComplete="current-password" placeholder={t("st.currentPasswordPlaceholder")} required />
          <Field name="next" id="new-password" label={t("st.newPassword")} type="password" autoComplete="new-password" placeholder={t("st.newPasswordPlaceholder")} required minLength={MIN_PASSWORD_LENGTH}
            hint={t("auth.minChars", { n: MIN_PASSWORD_LENGTH })} />
        </>
      )}
    </ActionForm>
  );
}
