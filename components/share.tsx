"use client";

import { useState } from "react";
import { ActionForm, Hidden } from "./form";
import { Icon } from "./icons";
import { Card, quietButton } from "./ui";
import { shareBiodataAction, unshareBiodataAction } from "@/lib/actions/share";

/** Card on a person's page: switch the public biodata link on or off, copy it, send it on WhatsApp. */
export function ShareCard({ id, no, link }: { id: string; no: string; link: string | null }) {
  return (
    <Card title="বায়োডাটা শেয়ার">
      {link ? (
        <>
          <p className="text-sm text-muted">
            এই লিংক যে পাবে সে লগইন ছাড়াই বায়োডাটা {no} পড়তে পারবে। নাম, ছবি, বাবা-মা, অভিভাবকের ফোন, গ্রাম, আয় আর আপনার নোট লিংকে নেই।
          </p>
          <div className="flex gap-2">
            <input readOnly value={link} aria-label="শেয়ার লিংক" onFocus={(e) => e.currentTarget.select()}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-sunk px-3 text-sm" />
            <CopyButton text={link} />
          </div>
          <a href={`https://wa.me/?text=${encodeURIComponent(`বায়োডাটা ${no}: ${link}`)}`} target="_blank" rel="noopener noreferrer" className={`${quietButton} w-full`}>
            <Icon name="share" size={18} />হোয়াটসঅ্যাপে পাঠান
          </a>
          <ActionForm action={unshareBiodataAction} tone="danger" submitLabel="লিংক বন্ধ করুন" pendingLabel="বন্ধ হচ্ছে…">
            {() => <Hidden name="id" value={id} />}
          </ActionForm>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            পরিবারকে দেখানোর জন্য একটা লিংক তৈরি করুন। লিংকে থাকবে বয়স, উচ্চতা, ধর্ম, বৈবাহিক অবস্থা, শিক্ষা, পেশা, উপজেলা-জেলা, পরিবারের বিবরণ,
            প্রত্যাশা আর আপনার যোগাযোগ নম্বর। নাম, ছবি, বাবা-মা, অভিভাবকের ফোন, গ্রাম, আয় আর নোট থাকবে না। যেকোনো সময় বন্ধ করা যায়।
          </p>
          <ActionForm action={shareBiodataAction} submitLabel={<><Icon name="link" size={18} />শেয়ার লিংক তৈরি করুন</>} pendingLabel="তৈরি হচ্ছে…">
            {() => <Hidden name="id" value={id} />}
          </ActionForm>
        </>
      )}
    </Card>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* an old browser: the field beside selects itself on focus, so it can be copied by hand */
    }
  };
  return (
    <button type="button" onClick={copy} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-bold text-on-primary">
      <Icon name={done ? "check" : "copy"} size={16} />{done ? "কপি হয়েছে" : "কপি"}
    </button>
  );
}
