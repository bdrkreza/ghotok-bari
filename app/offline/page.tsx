import type { Metadata } from "next";
import { primaryButton } from "@/components/ui";

export const metadata: Metadata = { title: "ইন্টারনেট নেই" };

/** Shown by the service worker (public/sw.js) when a page cannot be fetched. Public: no sign-in needed to cache it. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <span aria-hidden className="grid size-14 place-items-center rounded-2xl bg-primary font-display text-2xl font-extrabold text-on-primary">আ</span>
      <h1 className="font-display text-xl font-bold">ইন্টারনেট নেই</h1>
      <p className="text-muted">সংযোগ ফিরে এলে আবার চেষ্টা করুন। আপনার খাতার সব তথ্য সার্ভারে নিরাপদে আছে।</p>
      {/* a plain form submit, so the retry works before any script has loaded */}
      <form action="/"><button type="submit" className={primaryButton}>আবার চেষ্টা করুন</button></form>
    </main>
  );
}
