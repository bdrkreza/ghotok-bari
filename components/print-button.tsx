"use client";

import { Icon } from "./icons";
import { quietButton } from "./ui";
import { useT } from "@/lib/i18n/client";

/**
 * Prints the page, or saves it as a PDF from the browser's print dialog ("Save as PDF"), free and on the phone. The
 * bars, buttons and ornaments carry `print:hidden`, so the paper gets the biodata alone.
 */
export function PrintButton({ className = "" }: { className?: string }) {
  const { t } = useT();
  return (
    <button type="button" onClick={() => window.print()} className={`${quietButton} print:hidden ${className}`}>
      <Icon name="note" size={18} />{t("common.printPdf")}
    </button>
  );
}
