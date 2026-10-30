"use client";

import { ActionForm, Checkbox, Field } from "@/components/form";
import { loginAction, registerAction } from "@/lib/auth/actions";
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

export function RegisterForm() {
  return (
    <ActionForm action={registerAction} submitLabel="রেজিস্টার করুন" pendingLabel="অ্যাকাউন্ট তৈরি হচ্ছে…">
      {(v) => (
        <>
          <Field name="name" label="আপনার নাম" autoComplete="name" placeholder="ঘটকের পূর্ণ নাম" required defaultValue={v.name} />
          <Field name="phone" label="মোবাইল নম্বর" type="tel" inputMode="tel" autoComplete="username" placeholder="০১৭XX-XXXXXX" required defaultValue={v.phone}
            hint="এই নম্বরটিই আপনার লগইন ID। কোনো SMS পাঠানো হবে না।" />
          <Field name="password" label="পাসওয়ার্ড" type="password" autoComplete="new-password" placeholder="একটি পাসওয়ার্ড দিন" required hint={`ন্যূনতম ${bn(MIN_PASSWORD_LENGTH)} অক্ষর`} />
        </>
      )}
    </ActionForm>
  );
}
