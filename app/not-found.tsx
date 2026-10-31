import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display text-5xl font-extrabold text-primary">{t("notFound.code")}</p>
      <h1 className="font-display text-xl font-bold">{t("notFound.title")}</h1>
      <p className="text-muted">{t("notFound.text")}</p>
      <Link href="/" className="inline-flex min-h-12 items-center rounded-2xl bg-primary px-5 font-bold text-on-primary">{t("notFound.home")}</Link>
    </main>
  );
}
