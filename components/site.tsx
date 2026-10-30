import { Icon, type IconName } from "./icons";
import { outlineButton, primaryButton } from "./ui";
import { bn } from "@/lib/bn";

// Pieces of the ghotok's public face, shared by the front page and a family's own page. No hooks: they render on the server.

/** Call and WhatsApp buttons for the ghotok's numbers. */
export function ContactButtons({ phone, whatsapp, className = "" }: { phone: string; whatsapp: string; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      <a href={`tel:${phone}`} className={primaryButton}><Icon name="phone" size={18} />{bn(phone)}</a>
      <a href={`https://wa.me/88${whatsapp}`} target="_blank" rel="noopener noreferrer" className={outlineButton}>
        <Icon name="share" size={18} />WhatsApp
      </a>
    </div>
  );
}

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "note", title: "বায়োডাটা দিন", text: "নিজের বা পরিবারের কারও জন্য বায়োডাটা লিখুন; ঘটক দেখে তালিকায় তুলবেন।" },
  { icon: "search", title: "পাত্র-পাত্রী দেখুন", text: "বয়স, জেলা, শিক্ষা দিয়ে খুঁজুন। নাম-ছবি গোপন থাকে, ঘটক দুই পক্ষকে মেলান।" },
  { icon: "heart", title: "আগ্রহ জানান", text: "পছন্দ হলে এক চাপে ঘটককে জানান; উনি দুই পরিবারের সাথে কথা বলবেন।" },
];

/** The three steps a family goes through, as numbered cards. */
export function HowItWorks() {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {STEPS.map((s, i) => (
        <li key={s.title} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 lg:p-5">
          <span className="flex items-center gap-2">
            <span aria-hidden className="grid size-9 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={s.icon} size={18} /></span>
            <span className="text-xs font-bold text-muted">ধাপ {bn(i + 1)}</span>
          </span>
          <span className="font-bold">{s.title}</span>
          <span className="text-sm text-muted">{s.text}</span>
        </li>
      ))}
    </ul>
  );
}
