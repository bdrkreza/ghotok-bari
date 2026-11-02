import { Icon, type IconName } from "./icons";
import { outlineButton, primaryButton } from "./ui";
import type { T } from "@/lib/i18n";

// Pieces of the ghotok's public face, shared by the front page and a family's own page. No hooks: they render on
// the server and take the language (`t`) from the page.

/**
 * Call and WhatsApp buttons for the ghotok's numbers: side by side, or one under the other (`stack`) in a narrow column.
 * `text` starts the WhatsApp message, e.g. which biodata the family is asking about.
 */
export function ContactButtons({ phone, whatsapp, t, className = "", stack = false, text }: { phone: string; whatsapp: string; t: T; className?: string; stack?: boolean; text?: string }) {
  return (
    <div className={`grid gap-3 ${stack ? "" : "grid-cols-2"} ${className}`}>
      <a href={`tel:${phone}`} className={primaryButton}>
        <Icon name="phone" size={18} />
        <span className="flex flex-col items-start leading-tight">{t.t(stack ? "contact.call" : "contact.callShort")}<span className="text-xs font-semibold opacity-85">{t.n(phone)}</span></span>
      </a>
      <a href={`https://wa.me/88${whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`} target="_blank" rel="noopener noreferrer" className={outlineButton}>
        <Icon name="share" size={18} />{t.t(stack ? "contact.whatsapp" : "common.whatsapp")}
      </a>
    </div>
  );
}

const STEP_ICONS: IconName[] = ["note", "search", "heart"];

/** The three steps a family goes through, as numbered cards. */
export function HowItWorks({ t }: { t: T }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {STEP_ICONS.map((icon, i) => (
        <li key={icon} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 lg:p-5">
          <span className="flex items-center gap-2">
            <span aria-hidden className="grid size-9 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={icon} size={18} /></span>
            <span className="text-xs font-bold text-muted">{t.t("steps.step", { n: i + 1 })}</span>
          </span>
          <span className="font-bold">{t.t(`steps.${i + 1}Title` as "steps.1Title")}</span>
          <span className="text-sm text-muted">{t.t(`steps.${i + 1}Text` as "steps.1Text")}</span>
        </li>
      ))}
    </ul>
  );
}
