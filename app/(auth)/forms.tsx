"use client";

import { ActionForm, Checkbox, Field } from "@/components/form";
import { loginAction, registerAction, setupAction } from "@/lib/auth/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/phone";
import { useT } from "@/lib/i18n/client";

export function LoginForm() {
  const { t } = useT();
  return (
    <ActionForm action={loginAction} submitLabel={t("auth.login")} pendingLabel={t("auth.loggingIn")}>
      {(v) => (
        <>
          <Field name="phone" label={t("auth.phone")} type="tel" inputMode="tel" autoComplete="username" placeholder={t("auth.phonePlaceholder")} required defaultValue={v.phone} />
          <Field name="password" label={t("auth.password")} type="password" autoComplete="current-password" placeholder={t("auth.passwordPlaceholder")} required />
          {/* ticked (the default): the long session from createAuth; unticked: gone when the browser closes */}
          <Checkbox name="remember" label={t("auth.remember")} defaultChecked />
        </>
      )}
    </ActionForm>
  );
}

/** A family's account. */
export function RegisterForm() {
  const { t } = useT();
  return (
    <ActionForm action={registerAction} submitLabel={t("auth.register")} pendingLabel={t("auth.registering")}>
      {(v) => (
        <>
          <Field name="name" label={t("auth.yourName")} autoComplete="name" placeholder={t("auth.fullName")} required defaultValue={v.name} />
          <Field name="phone" label={t("auth.phone")} type="tel" inputMode="tel" autoComplete="username" placeholder={t("auth.phonePlaceholder")} required defaultValue={v.phone}
            hint={t("auth.phoneHint")} />
          <Field name="password" label={t("auth.password")} type="password" autoComplete="new-password" placeholder={t("auth.newPasswordPlaceholder")} required hint={t("auth.minChars", { n: MIN_PASSWORD_LENGTH })} />
        </>
      )}
    </ActionForm>
  );
}

/** First run: the ghotok's own account and the site, in one form. */
export function SetupForm() {
  const { t } = useT();
  return (
    <ActionForm action={setupAction} submitLabel={t("setup.submit")} pendingLabel={t("setup.submitting")}>
      {(v) => (
        <>
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-3 text-xs font-bold text-primary">{t("setup.ghotokAccount")}</legend>
            <Field name="ghotokName" label={t("setup.ghotokName")} autoComplete="name" placeholder={t("setup.ghotokNamePlaceholder")} required defaultValue={v.ghotokName} />
            <Field name="phone" label={t("auth.phone")} type="tel" inputMode="tel" autoComplete="username" placeholder={t("auth.phonePlaceholder")} required defaultValue={v.phone}
              hint={t("setup.phoneHint")} />
            <Field name="password" label={t("auth.password")} type="password" autoComplete="new-password" placeholder={t("auth.newPasswordPlaceholder")} required hint={t("auth.minChars", { n: MIN_PASSWORD_LENGTH })} />
          </fieldset>
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-3 text-xs font-bold text-primary">{t("setup.site")}</legend>
            <Field name="name" label={t("setup.siteName")} placeholder={t("setup.siteNamePlaceholder")} required defaultValue={v.name} />
            <Field name="address" label={t("setup.address")} placeholder={t("setup.addressPlaceholder")} defaultValue={v.address} />
            <Field name="whatsapp" label={t("setup.whatsapp")} type="tel" inputMode="tel" placeholder={t("setup.whatsappPlaceholder")} defaultValue={v.whatsapp} />
          </fieldset>
        </>
      )}
    </ActionForm>
  );
}
