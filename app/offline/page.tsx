import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { primaryButton } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("offline.title") };
}

/** Shown by the service worker (public/sw.js) when a page cannot be fetched. Public: no sign-in needed to cache it. */
export default async function OfflinePage() {
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo className="size-14 rounded-2xl" />
      <h1 className="font-display text-xl font-bold">{t("offline.title")}</h1>
      <p className="text-muted">{t("offline.text")}</p>
      {/* a plain form submit, so the retry works before any script has loaded */}
      <form action="/"><button type="submit" className={primaryButton}>{t("offline.retry")}</button></form>
    </main>
  );
}
