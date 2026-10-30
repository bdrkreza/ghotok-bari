import { Icon, type IconName } from "@/components/icons";
import { currentSite } from "@/lib/auth/session";
import { DEFAULT_TAGLINE } from "@/lib/services/site";

const FAMILY_FEATURES: { icon: IconName; text: string }[] = [
  { icon: "lock", text: "নাম, ছবি ও যোগাযোগ অন্য পরিবার দেখে না" },
  { icon: "people", text: "ঘটক দুই পরিবারের সাথে নিজে কথা বলেন" },
  { icon: "note", text: "বায়োডাটা দিয়ে রাখুন, মিল পেলে খবর পাবেন" },
];

const SETUP_FEATURES: { icon: IconName; text: string }[] = [
  { icon: "people", text: "পরিবাররা বায়োডাটা দেখে ও নিজেরটা দেয়" },
  { icon: "shield", text: "কে কী দেখবে তা আপনি ঠিক করেন" },
  { icon: "card", text: "প্রস্তাব আর টাকার হিসাব এক খাতায়" },
];

/**
 * The sign-in shell. Phone: a slim coloured brand bar, then the form in one column. Web (lg): the bar grows into a
 * full-height panel down the left with the site's pitch, and the form sits centred beside it. Before the site exists
 * (the /setup screen) the panel speaks to the ghotok instead of to families.
 */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const site = await currentSite();
  const features = site ? FAMILY_FEATURES : SETUP_FEATURES;
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="bg-panel px-4 py-4 text-on-panel lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[26rem] lg:shrink-0 lg:flex-col lg:justify-between lg:px-12 lg:py-12 xl:w-[30rem] 2xl:w-[36rem] 2xl:px-14">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 lg:mx-0 lg:max-w-none">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-on-panel font-display text-xl font-extrabold text-panel lg:size-14 lg:text-2xl">ঘ</span>
          <div className="flex min-w-0 flex-col">
            <p className="truncate font-display text-2xl leading-tight font-bold lg:text-3xl">{site?.name ?? "আলতা"}</p>
            <p className="truncate text-sm text-on-panel/80">{site ? (site.tagline ?? DEFAULT_TAGLINE) : "ঘটকের নিজের ওয়েবসাইট"}</p>
          </div>
        </div>
        <div className="hidden flex-col items-start gap-5 lg:flex">
          <span className="rounded-full bg-panel-soft px-3.5 py-1 text-sm font-bold text-panel">{site ? "পাত্র-পাত্রী পক্ষের জন্য" : "প্রথমবার"}</span>
          <p className="max-w-md font-display text-4xl/[1.25] font-extrabold text-balance xl:text-5xl/[1.25]">
            {site ? "পছন্দের পাত্র-পাত্রী খুঁজুন, নিজের বায়োডাটা দিন" : "আপনার ঘটকালির ওয়েবসাইট চালু করুন"}
          </p>
          <p className="max-w-sm text-lg leading-relaxed text-on-panel/85">
            {site
              ? "বয়স, শিক্ষা, পেশা আর এলাকা দিয়ে খুঁজুন; পছন্দ হলে ঘটককে জানান, বাকিটা উনি দেখবেন।"
              : "একবার তথ্য দিলেই সাইট তৈরি: পরিবাররা রেজিস্টার করে বায়োডাটা দেখবে আর দেবে, আপনি ড্যাশবোর্ড থেকে সব চালাবেন।"}
          </p>
        </div>
        <ul className="hidden flex-col gap-4 lg:flex">
          {features.map((f) => (
            <li key={f.text} className="flex items-center gap-4 text-lg">
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
