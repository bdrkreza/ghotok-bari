import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display text-5xl font-extrabold text-primary">৪০৪</p>
      <h1 className="font-display text-xl font-bold">এই পাতাটি নেই</h1>
      <p className="text-muted">হয়তো মুছে ফেলা হয়েছে, নয়তো ঠিকানায় ভুল আছে।</p>
      <Link href="/" className="inline-flex min-h-12 items-center rounded-2xl bg-primary px-5 font-bold text-on-primary">হোমে ফিরুন</Link>
    </main>
  );
}
