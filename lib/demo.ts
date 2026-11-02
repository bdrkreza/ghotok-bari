import { eq } from "drizzle-orm";
import type { Auth } from "./auth";
import { placeholderEmail } from "./auth/phone";
import type { Db } from "./db";
import { profile, user } from "./db/schema";
import { submitBiodata } from "./services/biodata";
import { addEntry } from "./services/ledger";
import { createProfile, setApproval } from "./services/profiles";
import { expressInterest, toggleFavorite } from "./services/interests";
import { addNote, changeStatus, createProposal, setFollowUp } from "./services/proposals";
import { createSite, getSite } from "./services/site";
import { today } from "./time";

/** The ghotok the demo site belongs to. Only ever created on the embedded development database. */
export const DEMO = { name: "আব্দুল করিম ঘটক", phone: "01700000000", password: "alta1234" };
export const DEMO_SITE = { name: "করিম ঘটক ম্যারেজ মিডিয়া", address: "বাঁশবাড়িয়া, সাভার, ঢাকা", whatsapp: "" };
/** Two families with accounts, so the customer side and the accounts list have something on them. */
export const DEMO_CUSTOMER = { name: "রহিমা বেগম", phone: "01700000002", password: "alta1234" };
const DEMO_CUSTOMER_2 = { name: "মো. জসিম উদ্দিন", phone: "01700000003", password: "alta1234" };

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return today(d);
};

/**
 * Fills a fresh development database with the demo site, its ghotok and a realistic week of work, so every screen
 * has something on it, plus two customer accounts. Signs the demo ghotok in (Better Auth sets the cookie). Run
 * again, it only adds whatever is missing and signs the ghotok in.
 */
export async function seedDemo(db: Db, auth: Auth, headers: Headers): Promise<{ created: boolean }> {
  const exists = async (phone: string) => Boolean(await db.query.user.findFirst({ where: eq(user.username, phone) }));

  const signUp = async (acct: { name: string; phone: string; password: string }) => {
    await auth.api.signUpEmail({ body: { name: acct.name, email: placeholderEmail(acct.phone), password: acct.password, username: acct.phone }, headers });
    const row = await db.query.user.findFirst({ where: eq(user.username, acct.phone) });
    if (!row) throw new Error("demo sign-up failed");
    return row.id;
  };
  // Every sign-up sets the cookie, so the families go first and the browser ends up as the demo ghotok.
  for (const c of [DEMO_CUSTOMER, DEMO_CUSTOMER_2]) if (!(await exists(c.phone))) await signUp(c);

  const seen = await db.query.user.findFirst({ where: eq(user.username, DEMO.phone) });
  const g = seen?.id ?? (await signUp(DEMO));
  if (seen) await auth.api.signInUsername({ body: { username: DEMO.phone, password: DEMO.password }, headers }).catch(() => undefined);
  // the site, owned by the demo ghotok (which also makes them an admin), unless /setup was already done by hand
  if (!(await getSite(db))) await createSite(db, g, DEMO_SITE);
  // the sample people, unless the ghotok already has some (made at /setup with the demo number, or seeded earlier)
  if (await db.query.profile.findFirst({ where: eq(profile.ghotokId, g) })) return { created: false };

  const person = (kind: "patro" | "patri", over: Record<string, string>) =>
    createProfile(db, g, { kind, religion: "islam", maritalStatus: "obibahito", ...over });

  const hasan = await person("patro", {
    name: "হাসান মাহমুদ", fatherName: "মো. আলমগীর হোসেন", motherName: "হাসিনা বেগম", birthYear: "1995", heightCm: "170",
    education: "অনার্স (ব্যবস্থাপনা)", profession: "ব্যাংক কর্মকর্তা", monthlyIncome: "45000",
    village: "বাঁশবাড়িয়া", upazila: "সাভার", district: "ঢাকা", guardianName: "মো. আলমগীর হোসেন (বাবা)", guardianPhone: "01711111111",
    familyDetails: "৩ ভাই ১ বোন। নিজেদের পাকা বাড়ি, ৫ বিঘা জমি। বাবা অবসরপ্রাপ্ত স্কুলশিক্ষক।",
    expectations: "শিক্ষিত, নম্র, সাভার বা আশেপাশের পরিবার হলে ভালো।",
    complexion: "shyamla", weightKg: "68", bloodGroup: "O+", educationMedium: "general", workplace: "ঢাকায় বেসরকারি ব্যাংকে অফিসার", presentAddress: "ঢাকা",
    brothers: "3", sisters: "1", familyStatus: "moddho", religiousPractice: "নামাজ পড়েন",
    afterStudy: "yes", afterJob: "discuss", afterHome: "family", dowry: "none",
    expectAgeMin: "22", expectAgeMax: "28", expectEducation: "hsc", expectMarital: "obibahito", expectDistricts: "ঢাকা, গাজীপুর",
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
    complexion: "ujjol_shyamla", weightKg: "52", bloodGroup: "B+", educationMedium: "general", workplace: "কালিয়াকৈরে সরকারি প্রাথমিক বিদ্যালয়",
    brothers: "1", sisters: "1", familyStatus: "moddho", religiousPractice: "পাঁচ ওয়াক্ত নামাজ পড়েন, পর্দা করেন",
    afterStudy: "yes", afterJob: "yes", jointFamily: "yes",
    expectAgeMin: "27", expectAgeMax: "34", expectEducation: "bachelor", expectMarital: "obibahito", expectDistricts: "ঢাকা, গাজীপুর",
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
    complexion: "shyamla", bloodGroup: "B+", brothers: "2", sisters: "0", familyStatus: "nimno", religiousPractice: "নামাজ পড়েন",
    afterStudy: "no", afterJob: "yes", jointFamily: "yes", expectAgeMin: "30", expectAgeMax: "42", expectMarital: "talak_ok", expectDistricts: "কুমিল্লা",
  });

  // হাসান ও ফাতেমা: talks going well
  const p1 = await createProposal(db, g, { patroId: hasan, patriId: fatema, note: "ফাতেমার মামার মাধ্যমে প্রস্তাব।" });
  await changeStatus(db, g, p1, "dekha_shona", "পাত্রপক্ষ শুক্রবার দেখতে গিয়েছিল, পছন্দ হয়েছে।");
  await changeStatus(db, g, p1, "kotha_cholche", "দেনমোহর নিয়ে কথা চলছে।");
  await addNote(db, g, p1, "পাত্রীপক্ষ আগামী সপ্তাহে হাসানদের বাড়ি যাবে।");
  await addEntry(db, g, { kind: "chukti", amount: "20000", entryDate: daysAgo(6), proposalId: p1, note: "দুই পক্ষ মিলে" });
  await addEntry(db, g, { kind: "joma", amount: "5000", entryDate: daysAgo(2), proposalId: p1, note: "পাত্রপক্ষ থেকে অগ্রিম" });
  await setFollowUp(db, g, p1, today());

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

  // what the two families handed in: one biodata still waiting for the ghotok, one already listed
  const idOf = async (phone: string) => (await db.query.user.findFirst({ where: eq(user.username, phone) }))!.id;
  await submitBiodata(db, g, await idOf(DEMO_CUSTOMER.phone), {
    kind: "patri", pledge: "on", religion: "islam", maritalStatus: "obibahito", name: "সুমাইয়া আক্তার", fatherName: "মৃত আব্দুল হাই", motherName: "রহিমা বেগম",
    complexion: "forsha", bloodGroup: "A+", brothers: "1", sisters: "1", familyStatus: "moddho", afterStudy: "yes", afterJob: "discuss", jointFamily: "discuss",
    expectAgeMin: "25", expectAgeMax: "32", expectEducation: "bachelor",
    birthYear: "2003", heightCm: "157", education: "অনার্স (পড়ছে)", profession: "শিক্ষার্থী",
    village: "কাটাখালী", upazila: "সাভার", district: "ঢাকা", guardianName: "রহিমা বেগম (মা)", guardianPhone: DEMO_CUSTOMER.phone,
    familyDetails: "১ ভাই ১ বোন। মা গৃহিণী, ভাই ব্যবসা করে।", expectations: "চাকরিজীবী, ধার্মিক; পড়া চালিয়ে যেতে দেবে এমন পরিবার।",
  });
  const tanvir = await submitBiodata(db, g, await idOf(DEMO_CUSTOMER_2.phone), {
    kind: "patro", pledge: "on", showParents: "on", religion: "islam", maritalStatus: "obibahito", name: "তানভীর হোসেন", fatherName: "মো. জসিম উদ্দিন",
    complexion: "shyamla", weightKg: "70", bloodGroup: "O+", educationMedium: "general", workplace: "ঢাকায় সফটওয়্যার কোম্পানিতে", presentAddress: "ঢাকা",
    brothers: "1", sisters: "0", familyStatus: "uccho_moddho", afterStudy: "yes", afterJob: "yes", afterHome: "city", dowry: "none",
    expectAgeMin: "22", expectAgeMax: "27", expectEducation: "hsc", expectDistricts: "ঢাকা, গাজীপুর",
    birthYear: "1996", heightCm: "173", education: "বিএসসি ইঞ্জিনিয়ারিং", profession: "সফটওয়্যার ইঞ্জিনিয়ার", monthlyIncome: "55000",
    village: "বোর্ডবাজার", upazila: "গাজীপুর সদর", district: "গাজীপুর", guardianName: "মো. জসিম উদ্দিন (বাবা)", guardianPhone: DEMO_CUSTOMER_2.phone,
    familyDetails: "২ ভাই। বাবা অবসরপ্রাপ্ত ব্যাংকার, নিজেদের বাড়ি।", expectations: "শিক্ষিত, নম্র; ঢাকা-গাজীপুরের মধ্যে হলে ভালো।",
  });
  await setApproval(db, g, tanvir, "approved");
  // তানভীরের বাবা ফাতেমার বায়োডাটায় আগ্রহ জানিয়েছেন, আর রুমারটা পছন্দের তালিকায় রেখেছেন
  const jasim = await idOf(DEMO_CUSTOMER_2.phone);
  await expressInterest(db, g, jasim, { profileId: fatema, forProfileId: tanvir, note: "শুক্রবার বিকেলে কথা বলা যায়।" });
  await toggleFavorite(db, g, jasim, ruma);
  return { created: true };
}
