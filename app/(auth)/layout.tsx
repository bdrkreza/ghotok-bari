import { Icon, type IconName } from "@/components/icons";

const FEATURES: { icon: IconName; text: string }[] = [
  { icon: "shield", text: "ছবি ও তথ্য শুধু অনুমতিতে দেখা যায়" },
  { icon: "people", text: "প্রতিটি ধাপে পরিবারের সম্মতি" },
  { icon: "card", text: "চুক্তি, জমা আর বাকির পরিষ্কার হিসাব" },
];

/**
 * The sign-in shell. Phone: a slim alta-coloured brand bar, then the form in one column. Web (lg): the bar grows
 * into a full-height panel down the left with the pitch and three promises, and the form sits centred beside it.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="bg-panel px-4 py-4 text-on-panel lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[26rem] lg:shrink-0 lg:flex-col lg:justify-between lg:px-12 lg:py-12 xl:w-[30rem] 2xl:w-[36rem] 2xl:px-14">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 lg:mx-0 lg:max-w-none">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-on-panel font-display text-xl font-extrabold text-panel lg:size-14 lg:text-2xl">আ</span>
          <div className="flex flex-col">
            <p className="font-display text-2xl leading-tight font-bold lg:text-3xl">আলতা</p>
            <p className="text-sm text-on-panel/80">বিশ্বস্ত ঘটকালির খাতা</p>
          </div>
        </div>
        <div className="hidden flex-col items-start gap-5 lg:flex">
          <span className="rounded-full bg-panel-soft px-3.5 py-1 text-sm font-bold text-panel">ঘটকদের জন্য</span>
          <p className="max-w-md font-display text-4xl/[1.25] font-extrabold text-balance xl:text-5xl/[1.25]">সব পাত্র-পাত্রী, প্রস্তাব আর হিসাব — এক খাতায়</p>
          <p className="max-w-sm text-lg leading-relaxed text-on-panel/85">প্রোফাইল সাজান, প্রস্তাবের খবর রাখুন, পরিবারের সাথে নিরাপদে যোগাযোগ করুন।</p>
        </div>
        <ul className="hidden flex-col gap-4 lg:flex">
          {FEATURES.map((f) => (
            <li key={f.icon} className="flex items-center gap-4 text-lg">
              <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-on-panel/10"><Icon name={f.icon} size={22} /></span>
              {f.text}
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 lg:px-12 lg:py-16">
        <div className="flex w-full max-w-md flex-col gap-6 lg:max-w-xl">
          {children}
          <p className="flex items-center justify-center gap-2 text-sm text-muted"><Icon name="lock" size={16} />আপনার তথ্য সুরক্ষিত ও গোপন থাকে</p>
        </div>
      </main>
    </div>
  );
}
