"use client";

import { ActionForm, Field, TextArea } from "@/components/form";
import { updateSiteAction } from "@/lib/actions/site";
import { useT } from "@/lib/i18n/client";

interface SiteText { name: string; tagline: string; about: string; address: string; whatsapp: string }

/** The front page's words: the site's name, the line under it, the ghotok's paragraph, the address and WhatsApp. */
export function SiteForm({ site }: { site: SiteText }) {
  const { t } = useT();
  return (
    <ActionForm action={updateSiteAction} submitLabel={t("common.save")}>
      {(v) => (
        <>
          <Field name="name" label={t("setup.siteName")} placeholder={t("setup.siteNamePlaceholder")} required maxLength={80} defaultValue={v.name ?? site.name} />
          <Field name="tagline" label={t("sf.tagline")} placeholder={t("sf.taglinePlaceholder")} maxLength={120} hint={t("sf.blankStock")} defaultValue={v.tagline ?? site.tagline} />
          <TextArea name="about" label={t("sf.about")} placeholder={t("sf.aboutPlaceholder")} rows={6} maxLength={2000} hint={t("sf.blankStock")} defaultValue={v.about ?? site.about} />
          <Field name="address" label={t("setup.address")} placeholder={t("setup.addressPlaceholder")} maxLength={160} defaultValue={v.address ?? site.address} />
          <Field name="whatsapp" label={t("setup.whatsapp")} type="tel" inputMode="tel" placeholder={t("setup.whatsappPlaceholder")} defaultValue={v.whatsapp ?? site.whatsapp} />
        </>
      )}
    </ActionForm>
  );
}
