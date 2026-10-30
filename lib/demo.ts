import { eq } from "drizzle-orm";
import type { Auth } from "./auth";
import { placeholderEmail } from "./auth/phone";
import type { Db } from "./db";
import { user } from "./db/schema";
import { addEntry } from "./services/ledger";
import { createProfile } from "./services/profiles";
import { addNote, changeStatus, createProposal } from "./services/proposals";
import { today } from "./time";

/** The account the demo data belongs to. Only ever created on the embedded development database. */
export const DEMO = { name: "আব্দুল করিম ঘটক", phone: "01700000000", password: "alta1234" };
/** A demo admin, to see /admin; and a second ghotok, so the admin list has more than one row. */
export const DEMO_ADMIN = { name: "আলতা অ্যাডমিন", phone: "01700000009", password: "alta1234" };
const DEMO_OTHER = { name: "রহিমা বেগম ঘটক", phone: "01700000002", password: "alta1234" };

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return today(d);
};

/**
 * Fills a fresh development database with one ghotok and a realistic week of work, so every screen has
 * something on it, plus a demo admin and a second ghotok. Signs the demo ghotok in (Better Auth sets the cookie). Run again,
 * it only adds whichever demo accounts are missing and signs the ghotok in.
 */
export async function seedDemo(db: Db, auth: Auth, headers: Headers): Promise<{ created: boolean }> {
  const exists = async (phone: string) => Boolean(await db.query.user.findFirst({ where: eq(user.username, phone) }));

  const signUp = async (acct: { name: string; phone: string; password: string }) => {
    await auth.api.signUpEmail({ body: { name: acct.name, email: placeholderEmail(acct.phone), password: acct.password, username: acct.phone }, headers });
    const row = await db.query.user.findFirst({ where: eq(user.username, acct.phone) });
    if (!row) throw new Error("demo sign-up failed");
    return row.id;
  };
  // Every sign-up sets the cookie, so the other accounts go first and the browser ends up as the demo ghotok.
  if (!(await exists(DEMO_ADMIN.phone))) {
    const adminId = await signUp(DEMO_ADMIN);
    await db.update(user).set({ role: "admin" }).where(eq(user.id, adminId));
  }
  if (!(await exists(DEMO_OTHER.phone))) {
    const otherId = await signUp(DEMO_OTHER);
    await createProfile(db, otherId, { kind: "patri", religion: "islam", maritalStatus: "obibahito", name: "সালমা আক্তার", birthYear: "2001", district: "টাঙ্গাইল", upazila: "মির্জাপুর", education: "এইচএসসি" });
    await createProfile(db, otherId, { kind: "patro", religion: "islam", maritalStatus: "obibahito", name: "মাহবুব আলম", birthYear: "1993", district: "টাঙ্গাইল", upazila: "সখীপুর", profession: "ব্যবসা" });
  }
  if (await exists(DEMO.phone)) {
    // seeded earlier, perhaps before the accounts above existed: just sign the browser in as the demo ghotok
    await auth.api.signInUsername({ body: { username: DEMO.phone, password: DEMO.password }, headers }).catch(() => undefined);
    return { created: false };
  }
  const g = await signUp(DEMO);

  const person = (kind: "patro" | "patri", over: Record<string, string>) =>
    createProfile(db, g, { kind, religion: "islam", maritalStatus: "obibahito", ...over });

  const hasan = await person("patro", {
    name: "হাসান মাহমুদ", fatherName: "মো. আলমগীর হোসেন", motherName: "হাসিনা বেগম", birthYear: "1995", heightCm: "170",
    education: "অনার্স (ব্যবস্থাপনা)", profession: "ব্যাংক কর্মকর্তা", monthlyIncome: "45000",
    village: "বাঁশবাড়িয়া", upazila: "সাভার", district: "ঢাকা", guardianName: "মো. আলমগীর হোসেন (বাবা)", guardianPhone: "01711111111",
    familyDetails: "৩ ভাই ১ বোন। নিজেদের পাকা বাড়ি, ৫ বিঘা জমি। বাবা অবসরপ্রাপ্ত স্কুলশিক্ষক।",
    expectations: "শিক্ষিত, নম্র, সাভার বা আশেপাশের পরিবার হলে ভালো।",
  });
  const rafiq = await person("patro", {
    name: "রফিকুল ইসলাম", fatherName: "আব্দুল মজিদ", birthYear: "1992", heightCm: "165", maritalStatus: "talakprapto",
    education: "এইচএসসি", profession: "প্রবাসী (সৌদি আরব)", monthlyIncome: "60000",
    village: "চরপাড়া", upazila: "কুমিল্লা সদর", district: "কুমিল্লা", guardianName: "আব্দুল মজিদ (বাবা)", guardianPhone: "01733333333",
    familyDetails: "২ ভাই। বিদেশে ৮ বছর। আগের সংসারে সন্তান নেই।", expectations: "ধার্মিক পরিবার; বয়স ২২-৩০।",
  });
  const sumon = await person("patro", {
    name: "সুমন চন্দ্র দাস", fatherName: "নারায়ণ চন্দ্র দাস", birthYear: "1994", heightCm: "168", religion: "hindu",
    education: "ডিপ্লোমা ইঞ্জিনিয়ারিং", profession: "ইলেকট্রিশিয়ান", monthlyIncome: "25000",
    village: "শিবপুর", upazila: "নরসিংদী সদর", district: "নরসিংদী", guardianName: "নারায়ণ চন্দ্র দাস (বাবা)", guardianPhone: "01744444444",
  });
  const juel = await person("patro", {
    name: "জুয়েল রানা", fatherName: "মো. সোলায়মান", birthYear: "1998", heightCm: "172",
    education: "এসএসসি", profession: "কৃষি ও মাছের ঘের", monthlyIncome: "30000",
    village: "কুশুরা", upazila: "ধামরাই", district: "ঢাকা", guardianName: "মো. সোলায়মান (বাবা)", guardianPhone: "01755555555",
    notes: "পরিবার চায় তাড়াতাড়ি বিয়ে দিতে।",
  });

  const fatema = await person("patri", {
    name: "ফাতেমা আক্তার", fatherName: "মো. ইউসুফ আলী", motherName: "রাবেয়া খাতুন", birthYear: "2000", heightCm: "155",
    education: "এইচএসসি (পড়ছে)", profession: "শিক্ষার্থী",
    village: "কাউন্দিয়া", upazila: "সাভার", district: "ঢাকা", guardianName: "মো. ইউসুফ আলী (বাবা)", guardianPhone: "01722222222",
    familyDetails: "২ বোন ১ ভাই। বাবার মুদি দোকান।", expectations: "চাকরিজীবী, নিজের বাড়ি আছে এমন।",
  });
  const nazma = await person("patri", {
    name: "নাজমা বেগম", fatherName: "আব্দুর রহমান", birthYear: "1997", heightCm: "158",
    education: "অনার্স (বাংলা)", profession: "প্রাথমিক বিদ্যালয়ের শিক্ষক", monthlyIncome: "22000",
    village: "বোয়ালী", upazila: "কালিয়াকৈর", district: "গাজীপুর", guardianName: "আব্দুর রহমান (বাবা)", guardianPhone: "01766666666",
    expectations: "শিক্ষিত ও চাকরিজীবী পাত্র; চাকরি চালিয়ে যেতে দেবে এমন পরিবার।",
  });
  const shiuli = await person("patri", {
    name: "শিউলি রানী দাস", fatherName: "গোপাল চন্দ্র দাস", birthYear: "1999", heightCm: "152", religion: "hindu",
    education: "এইচএসসি", profession: "গৃহিণী",
    village: "ঘোড়াশাল", upazila: "পলাশ", district: "নরসিংদী", guardianName: "গোপাল চন্দ্র দাস (বাবা)", guardianPhone: "01777777777",
  });
  const ruma = await person("patri", {
    name: "রুমা খাতুন", fatherName: "মৃত আবুল কাশেম", birthYear: "1996", heightCm: "160", maritalStatus: "bidhoba",
    education: "এসএসসি", profession: "দর্জি", monthlyIncome: "8000",
    village: "রামচন্দ্রপুর", upazila: "মুরাদনগর", district: "কুমিল্লা", guardianName: "মো. জাহাঙ্গীর (মামা)", guardianPhone: "01788888888",
    familyDetails: "একটি মেয়ে আছে (৪ বছর)।", expectations: "সন্তান মেনে নেবে এমন সৎ মানুষ।",
  });

  // হাসান ও ফাতেমা: talks going well
  const p1 = await createProposal(db, g, { patroId: hasan, patriId: fatema, note: "ফাতেমার মামার মাধ্যমে প্রস্তাব।" });
  await changeStatus(db, g, p1, "dekha_shona", "পাত্রপক্ষ শুক্রবার দেখতে গিয়েছিল, পছন্দ হয়েছে।");
  await changeStatus(db, g, p1, "kotha_cholche", "দেনমোহর নিয়ে কথা চলছে।");
  await addNote(db, g, p1, "পাত্রীপক্ষ আগামী সপ্তাহে হাসানদের বাড়ি যাবে।");
  await addEntry(db, g, { kind: "chukti", amount: "20000", entryDate: daysAgo(6), proposalId: p1, note: "দুই পক্ষ মিলে" });
  await addEntry(db, g, { kind: "joma", amount: "5000", entryDate: daysAgo(2), proposalId: p1, note: "পাত্রপক্ষ থেকে অগ্রিম" });

  // সুমন ও শিউলি: fixed
  const p2 = await createProposal(db, g, { patroId: sumon, patriId: shiuli, note: "" });
  await changeStatus(db, g, p2, "dekha_shona", "");
  await changeStatus(db, g, p2, "thik_hoyeche", "অগ্রহায়ণের ১২ তারিখ বিয়ে।");
  await addEntry(db, g, { kind: "chukti", amount: "15000", entryDate: daysAgo(20), proposalId: p2 });
  await addEntry(db, g, { kind: "joma", amount: "15000", entryDate: daysAgo(3), proposalId: p2, note: "পুরো টাকা পাওয়া গেছে" });

  // রফিকুল ও রুমা: just proposed
  await createProposal(db, g, { patroId: rafiq, patriId: ruma, note: "রুমার মামা নিজে যোগাযোগ করেছেন।" });

  // জুয়েল ও নাজমা: dropped
  const p4 = await createProposal(db, g, { patroId: juel, patriId: nazma, note: "" });
  await changeStatus(db, g, p4, "bad", "পাত্রীপক্ষ চাকরিজীবী পাত্র চায়।");

  await addEntry(db, g, { kind: "khoroch", amount: "1200", entryDate: daysAgo(5), note: "সাভার যাতায়াত" });
  return { created: true };
}
