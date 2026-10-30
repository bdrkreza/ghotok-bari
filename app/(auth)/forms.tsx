"use client";

import { ActionForm, Checkbox, Field } from "@/components/form";
import { loginAction, registerAction, setupAction } from "@/lib/auth/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/phone";
import { bn } from "@/lib/bn";

export function LoginForm() {
  return (
    <ActionForm action={loginAction} submitLabel="লগইন করুন" pendingLabel="লগইন হচ্ছে…">
      {(v) => (
        <>
          <Field name="phone" label="মোবাইল নম্বর" type="tel" inputMode="tel" autoComplete="username" placeholder="০১৭XX-XXXXXX" required defaultValue={v.phone} />
          <Field name="password" label="পাসওয়ার্ড" type="password" autoComplete="current-password" placeholder="পাসওয়ার্ড লিখুন" required />
          {/* ticked (the default): the long session from createAuth; unticked: gone when the browser closes */}
          <Checkbox name="remember" label="আমাকে মনে রাখুন" defaultChecked />
        </>
      )}
    </ActionForm>
  );
}

/** A family's account. */
export function RegisterForm() {
  return (
    <ActionForm action={registerAction} submitLabel="রেজিস্টার করুন" pendingLabel="অ্যাকাউন্ট তৈরি হচ্ছে…">
      {(v) => (
        <>
          <Field name="name" label="আপনার নাম" autoComplete="name" placeholder="পূর্ণ নাম" required defaultValue={v.name} />
          <Field name="phone" label="মোবাইল নম্বর" type="tel" inputMode="tel" autoComplete="username" placeholder="০১৭XX-XXXXXX" required defaultValue={v.phone}
            hint="এই নম্বরটিই আপনার লগইন ID। কোনো SMS পাঠানো হবে না।" />
          <Field name="password" label="পাসওয়ার্ড" type="password" autoComplete="new-password" placeholder="একটি পাসওয়ার্ড দিন" required hint={`ন্যূনতম ${bn(MIN_PASSWORD_LENGTH)} অক্ষর`} />
        </>
      )}
    </ActionForm>
  );
}

/** First run: the ghotok's own account and the site, in one form. */
export function SetupForm() {
  return (
    <ActionForm action={setupAction} submitLabel="সাইট চালু করুন" pendingLabel="সাইট তৈরি হচ্ছে…">
      {(v) => (
        <>
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-3 text-xs font-bold text-primary">ঘটকের অ্যাকাউন্ট</legend>
            <Field name="ghotokName" label="ঘটকের নাম" autoComplete="name" placeholder="যেমন: আব্দুল করিম ঘটক" required defaultValue={v.ghotokName} />
            <Field name="phone" label="মোবাইল নম্বর" type="tel" inputMode="tel" autoComplete="username" placeholder="০১৭XX-XXXXXX" required defaultValue={v.phone}
              hint="এই নম্বরেই লগইন করবেন; পরিবাররা এই নম্বরে ফোন করবে।" />
            <Field name="password" label="পাসওয়ার্ড" type="password" autoComplete="new-password" placeholder="একটি পাসওয়ার্ড দিন" required hint={`ন্যূনতম ${bn(MIN_PASSWORD_LENGTH)} অক্ষর`} />
          </fieldset>
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-3 text-xs font-bold text-primary">সাইট</legend>
            <Field name="name" label="সাইটের নাম" placeholder="যেমন: করিম ঘটক ম্যারেজ মিডিয়া" required defaultValue={v.name} />
            <Field name="address" label="ঠিকানা" placeholder="গ্রাম, উপজেলা, জেলা" defaultValue={v.address} />
            <Field name="whatsapp" label="WhatsApp নম্বর" type="tel" inputMode="tel" placeholder="খালি রাখলে উপরের নম্বরই" defaultValue={v.whatsapp} />
          </fieldset>
        </>
      )}
    </ActionForm>
  );
}
