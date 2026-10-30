// Every expected failure is an AppError with a stable code. The UI turns codes into Bangla messages;
// raw error text never reaches the user.

export type AppErrorCode =
  | "not_found"
  | "invalid_input"
  | "patro_too_young"
  | "patri_too_young"
  | "same_kind"
  | "proposal_exists"
  | "bad_transition"
  | "amount_required"
  | "forbidden"
  | "self_role"
  | "owner_role"
  | "site_exists";

export class AppError extends Error {
  constructor(public readonly code: AppErrorCode, detail?: string) {
    super(detail ?? code);
    this.name = "AppError";
  }
}

export function messageFor(code: AppErrorCode): string {
  switch (code) {
    case "not_found": return "এটি খুঁজে পাওয়া যায়নি।";
    case "invalid_input": return "তথ্যে ভুল আছে। লাল দাগ দেওয়া ঘরগুলো দেখুন।";
    case "patro_too_young": return "পাত্রের বয়স কমপক্ষে ২১ বছর হতে হবে।";
    case "patri_too_young": return "পাত্রীর বয়স কমপক্ষে ১৮ বছর হতে হবে।";
    case "same_kind": return "একজন পাত্র ও একজন পাত্রী বেছে নিন।";
    case "proposal_exists": return "এই পাত্র-পাত্রীর প্রস্তাব আগেই দেওয়া আছে।";
    case "bad_transition": return "এই অবস্থা থেকে এখানে যাওয়া যায় না।";
    case "amount_required": return "টাকার পরিমাণ দিন।";
    case "forbidden": return "এই কাজের অনুমতি আপনার নেই।";
    case "self_role": return "নিজের ভূমিকা নিজে বদলানো যায় না।";
    case "owner_role": return "সাইটের মালিক ঘটক সবসময় অ্যাডমিন থাকেন।";
    case "site_exists": return "এই সাইট আগেই চালু করা হয়েছে। লগইন করুন।";
  }
}
