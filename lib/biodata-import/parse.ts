import { normalizePhone } from "../auth/phone";
import { currentYear } from "../time";

// Turns the text of a biodata document (typed out, exported from Word or PDF, or read off a photo by OCR) into
// the fields of our form, by rules: labels in Bangla and English ("Name", "নাম", "Date of Birth", "উচ্চতা"...),
// sections ("Education", "Family", "About me"), and a few conversions (5'3" -> cm, a date -> the year, a district's
// English spelling -> Bangla). Everything it is not sure about it leaves empty; the person checks the form anyway.
// Pure and synchronous, so it runs in the browser and in tests.

export type ImportField =
  | "kind" | "name" | "fatherName" | "motherName" | "birthYear" | "heightCm" | "religion" | "maritalStatus"
  | "education" | "profession" | "monthlyIncome" | "village" | "upazila" | "district" | "guardianName" | "guardianPhone"
  | "familyDetails" | "expectations";

export type Imported = Partial<Record<ImportField, string>>;

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const latinDigits = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

/* ---------- the 64 districts, English spellings (old and new) -> Bangla ---------- */

const DISTRICTS: [bn: string, ...en: string[]][] = [
  ["ঢাকা", "dhaka", "dacca"], ["গাজীপুর", "gazipur"], ["নারায়ণগঞ্জ", "narayanganj", "narayangonj"], ["নরসিংদী", "narsingdi", "narshingdi"],
  ["মুন্সীগঞ্জ", "munshiganj", "munshigonj"], ["মানিকগঞ্জ", "manikganj", "manikgonj"], ["টাঙ্গাইল", "tangail"], ["কিশোরগঞ্জ", "kishoreganj", "kishorganj", "kishoregonj"],
  ["ফরিদপুর", "faridpur"], ["গোপালগঞ্জ", "gopalganj", "gopalgonj"], ["মাদারীপুর", "madaripur"], ["রাজবাড়ী", "rajbari"], ["শরীয়তপুর", "shariatpur", "sariatpur"],
  ["চট্টগ্রাম", "chittagong", "chattogram", "ctg"], ["কক্সবাজার", "coxsbazar", "coxbazar"], ["কুমিল্লা", "comilla", "cumilla"], ["ব্রাহ্মণবাড়িয়া", "brahmanbaria", "brahmonbaria"],
  ["চাঁদপুর", "chandpur"], ["লক্ষ্মীপুর", "lakshmipur", "laxmipur", "lakshmipur"], ["নোয়াখালী", "noakhali"], ["ফেনী", "feni"],
  ["খাগড়াছড়ি", "khagrachhari", "khagrachari"], ["রাঙ্গামাটি", "rangamati"], ["বান্দরবান", "bandarban"],
  ["রাজশাহী", "rajshahi"], ["নাটোর", "natore"], ["নওগাঁ", "naogaon"], ["চাঁপাইনবাবগঞ্জ", "chapainawabganj", "chapainababganj", "nawabganj"],
  ["পাবনা", "pabna"], ["সিরাজগঞ্জ", "sirajganj", "sirajgonj"], ["বগুড়া", "bogra", "bogura"], ["জয়পুরহাট", "joypurhat", "jaipurhat"],
  ["খুলনা", "khulna"], ["যশোর", "jessore", "jashore"], ["সাতক্ষীরা", "satkhira"], ["মেহেরপুর", "meherpur"], ["নড়াইল", "narail"],
  ["চুয়াডাঙ্গা", "chuadanga"], ["কুষ্টিয়া", "kushtia"], ["মাগুরা", "magura"], ["বাগেরহাট", "bagerhat"], ["ঝিনাইদহ", "jhenaidah", "jhenidah", "jhinaidah"],
  ["বরিশাল", "barisal", "barishal"], ["ঝালকাঠি", "jhalokati", "jhalakathi", "jhalokathi"], ["পটুয়াখালী", "patuakhali"], ["পিরোজপুর", "pirojpur"], ["ভোলা", "bhola"], ["বরগুনা", "barguna"],
  ["সিলেট", "sylhet"], ["মৌলভীবাজার", "moulvibazar", "maulvibazar"], ["হবিগঞ্জ", "habiganj", "hobiganj", "habigonj"], ["সুনামগঞ্জ", "sunamganj", "sunamgonj"],
  ["রংপুর", "rangpur"], ["দিনাজপুর", "dinajpur"], ["গাইবান্ধা", "gaibandha"], ["কুড়িগ্রাম", "kurigram"], ["লালমনিরহাট", "lalmonirhat"],
  ["নীলফামারী", "nilphamari"], ["পঞ্চগড়", "panchagarh"], ["ঠাকুরগাঁও", "thakurgaon"],
  ["ময়মনসিংহ", "mymensingh"], ["জামালপুর", "jamalpur"], ["নেত্রকোনা", "netrokona", "netrakona"], ["শেরপুর", "sherpur"],
];

const squash = (s: string) => s.toLowerCase().replace(/[^a-zঀ-৿]/g, "");

/** The Bangla name of a district, from an English or Bangla spelling inside `token`; null when none matches. */
export function districtOf(token: string): string | null {
  const t = squash(token);
  if (!t) return null;
  for (const [bn, ...en] of DISTRICTS) {
    if (t === squash(bn) || t.endsWith(squash(bn)) || en.some((e) => t === e || t.endsWith(e))) return bn;
  }
  return null;
}

/* ---------- small converters ---------- */

/** 5'3", 5' 4", 5 ft 6 in, ৫ ফুট ৩ ইঞ্চি, 160 cm, ১৬০ সেমি -> whole centimetres */
export function heightToCm(text: string): number | null {
  const s = latinDigits(text);
  const cm = s.match(/\b(1\d\d|2[0-4]\d)\s*(?:cm|সেমি|সে\.?\s?মি)/i);
  if (cm) return Number(cm[1]);
  const ft = s.match(/\b([4-7])\s*(?:'|’|′|ft\.?|feet|ফুট)\s*(\d{1,2})?/i);
  if (ft) {
    const inches = Number(ft[1]) * 12 + Number(ft[2] ?? 0);
    return Math.round(inches * 2.54);
  }
  return null;
}

/** A four-digit birth year from a date, or from an age. */
export function yearOf(text: string): number | null {
  const s = latinDigits(text);
  const y = s.match(/\b(19[3-9]\d|20[0-2]\d)\b/);
  if (y) return Number(y[1]);
  const age = s.match(/\b(1[89]|[2-5]\d)\s*(?:years?|yrs?|বছর)/i);
  if (age) return currentYear() - Number(age[1]);
  return null;
}

const religionOf = (s: string) =>
  /islam|muslim|ইসলাম|মুসলিম|sunni|সুন্নি/i.test(s) ? "islam"
    : /hindu|হিন্দু|sanatan|সনাতন/i.test(s) ? "hindu"
      : /christian|খ্রি/i.test(s) ? "christian"
        : /buddh|বৌদ্ধ/i.test(s) ? "buddhist"
          : null;

const maritalOf = (s: string) =>
  /divorc|তালাক|ডিভোর্স/i.test(s) ? "talakprapto"
    : /widow|বিধবা|বিপত্নীক/i.test(s) ? "bidhoba"
      : /unmarried|single|never married|অবিবাহিত|অবিবাহিতা/i.test(s) ? "obibahito"
        : null;

/** Degree words a family writes in English, as the ghotok writes them. */
const DEGREES: [RegExp, string][] = [
  [/\bph\.?d\b/i, "পিএইচডি"], [/\bm\.?phil\b/i, "এমফিল"], [/\bmbbs\b/i, "এমবিবিএস"],
  [/\bmasters?\b|\bm\.?\s?(sc|a|com|ss|ba)\b|\bmba\b/i, "মাস্টার্স"], [/\bhon(?:ou)?rs\b|\bbachelor|\bb\.?\s?(sc|a|com|ss|ba)\b|\bbba\b/i, "অনার্স"],
  [/\bdiploma\b/i, "ডিপ্লোমা"], [/\bhsc\b|higher secondary|alim\b/i, "এইচএসসি"], [/\bssc\b|secondary school|dakhil\b/i, "এসএসসি"],
];

/** "Masters, Dhaka University (Year-2021)" -> "মাস্টার্স, Dhaka University (2021)"; Bangla text is kept as written. */
function tidyEducation(lines: string[]): string {
  const first = lines.slice(0, 2).join(", ").replace(/\s+/g, " ").replace(/\(?\s*year\s*[-:]?\s*(\d{4})\s*\)?/i, "($1)").trim();
  for (const [re, bn] of DEGREES) if (re.test(first)) return first.replace(re, bn).replace(/\s+,/g, ",");
  return first;
}

/* ---------- labels and sections ---------- */

type LabelField = ImportField | "dob" | "address" | "permanent" | "present" | "height" | "weight" | "blood" | "complexion" | "age" | "phone" | "workplace";
type Rule<F extends string> = { field: F; re: RegExp };

// a label at the start of a line, with the value after a colon, dash or Bangla "ঃ" (or straight after the label)
const LABELS: Rule<LabelField>[] = [
  { field: "name", re: /^(?:full\s*)?name(?: of (?:the )?(?:bride|groom|candidate))?|^(?:পাত্রীর|পাত্রের|নিজের)?\s*নাম/i },
  { field: "fatherName", re: /^father(?:'?s)?(?: name)?|^বাবার নাম|^পিতার নাম|^পিতা|^বাবা/i },
  { field: "motherName", re: /^mother(?:'?s)?(?: name)?|^মায়ের নাম|^মাতার নাম|^মাতা|^মা(?=\s|[:ঃ\-])/i },
  { field: "dob", re: /^date of birth|^d\.?o\.?b\.?|^birth ?date|^born|^জন্ম ?তারিখ|^জন্ম ?সাল|^জন্ম(?!স্থান)/i },
  { field: "age", re: /^age|^বয়স/i },
  { field: "height", re: /^height|^উচ্চতা/i },
  { field: "weight", re: /^weight|^ওজন/i },
  { field: "blood", re: /^blood(?: group)?|^রক্তের গ্রুপ|^রক্ত/i },
  { field: "complexion", re: /^complexion|^skin|^গায়ের রং|^গাত্রবর্ণ/i },
  { field: "religion", re: /^religion|^ধর্ম/i },
  { field: "maritalStatus", re: /^marital(?: status)?|^বৈবাহিক(?: অবস্থা)?/i },
  { field: "profession", re: /^profession|^occupation|^job(?: experience| title)?|^designation|^পেশা|^পদের নাম|^পদবি|^চাকুরী|^চাকরি/i },
  { field: "workplace", re: /^workplace|^employer|^company|^organi[sz]ation|^কর্মস্থল|^প্রতিষ্ঠান/i },
  { field: "monthlyIncome", re: /^(?:monthly )?income|^salary|^(?:মাসিক )?আয়|^বেতন/i },
  { field: "village", re: /^village|^vill\.?|^গ্রাম/i },
  { field: "upazila", re: /^upazil+a|^thana|^police station|^p\.?s\.?(?=\s*[:ঃ\-])|^উপজেলা|^থানা/i },
  { field: "district", re: /^district|^dist\.?|^জেলা/i },
  { field: "permanent", re: /^permanent(?: address)?|^স্থায়ী ঠিকানা/i },
  { field: "present", re: /^present(?: address)?|^current address|^বর্তমান ঠিকানা|^জন্মস্থান/i },
  { field: "address", re: /^address|^ঠিকানা/i },
  { field: "phone", re: /^(?:mobile|phone|contact|cell)(?: no\.?| number)?|^মোবাইল(?: নং| নম্বর)?|^ফোন|^যোগাযোগ/i },
  { field: "education", re: /^education(?:al)?(?: qualification)?|^qualification|^শিক্ষাগত যোগ্যতা|^শিক্ষা|^যোগ্যতা/i },
  { field: "expectations", re: /^expectation|^partner preference|^looking for|^about me|^প্রত্যাশা|^যেমন চান|^যেমন (?:পাত্র|পাত্রী) চান/i },
  { field: "familyDetails", re: /^family(?: details| information| background)?|^siblings?|^sibiling|^পারিবারিক(?: পরিচয়| বিবরণ)?|^পরিবার|^ভাইবোন/i },
];

type SectionField = "education" | "profession" | "familyDetails" | "expectations" | "address" | "permanent" | "present";

// section headers: a short line that is only a label (with or without a colon); the lines under it belong to it
const SECTIONS: Rule<SectionField>[] = [
  { field: "education", re: /^(?:education(?:al)?(?: ?(?:qualifications?|background))?|qualifications?|academic|শিক্ষাগত যোগ্যতা|শিক্ষা|যোগ্যতা|institution)$/i },
  { field: "profession", re: /^(?:job(?: experience)?|work(?: experience)?|occupation|profession|career|পেশা|কর্মজীবন)$/i },
  { field: "familyDetails", re: /^(?:family(?: details| information| background| members)?|siblings?|sibiling|পারিবারিক(?: পরিচয়| বিবরণ)?|পরিবার|ভাইবোন)$/i },
  { field: "expectations", re: /^(?:about me|expectations?|partner preference|looking for|preference|প্রত্যাশা|যেমন চান|আমার সম্পর্কে)$/i },
  { field: "address", re: /^(?:address|contact|ঠিকানা|যোগাযোগ)$/i },
  { field: "permanent", re: /^(?:permanent address|স্থায়ী ঠিকানা)$/i },
  { field: "present", re: /^(?:present address|current address|বর্তমান ঠিকানা)$/i },
];

const SEP = /^\s*[:ঃ\-–—|]\s*/;
// list markers, and the symbols OCR turns them into (®, ©, °)
const BULLET = /^\s*(?:[-•●▪■➢➤►*·®©°¤]|\d+[.)])\s*/;
/** lines that only decorate: headings like "BIO-DATA" or "Personal Information", page furniture */
const NOISE = /^(?:bio-?\s?data|biodata|curriculum vitae|cv|resume|জীবন ?বৃত্তান্ত|বায়োডাটা|personal(?: information| details)?|basic (?:info|information|indo)|পরিচয়|ব্যক্তিগত তথ্য|interested area|hobbies|hobby)\s*[:ঃ]?$/i;
const TITLE = /^(?:personal\s*\/?\s*)?(?:(bride|groom)\s*)?(?:details|bio-?data|biodata|cv)\s+[o0]f\s*(.*)$/i;
const isLabel = (line: string) => LABELS.some((r) => r.re.test(line));
const isHeader = (line: string) => SECTIONS.some((s) => s.re.test(line.replace(/\s*[:ঃ]\s*$/, "")));

/* ---------- the parser ---------- */

/** Fields read from a biodata's text. Missing or unsure ones are left out. */
/** A person's name as OCR gives it, without the stray digits and symbols around it ("8 মোসাঃ শিল্পী খানম 4"). */
const cleanName = (s: string) => s.replace(/^[^\p{L}]+|[^\p{L}.)]+$/gu, "").replace(/\s+/g, " ").trim();

export function parseBiodataText(raw: string): Imported {
  // OCR writes the Bangla full stop as "৷" and sometimes "|"; normalise those first
  const text = latinDigits(raw).replace(/\r/g, "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/৷/g, "।").replace(/([ঀ-৿])\s*\|/g, "$1।");
  const lines = text.split("\n").map((l) => l.replace(BULLET, "").replace(/\s+/g, " ").trim()).filter(Boolean);

  const out: Imported = {};
  const extras: string[] = []; // blood group, weight, complexion and other lines without a field of their own
  const sections: Partial<Record<SectionField, string[]>> = {};
  const addresses: Partial<Record<"permanent" | "present" | "address", string[]>> = {};
  let section: SectionField | null = null;

  const clean = (value: string) => value.replace(/\s+/g, " ").trim().replace(/\s*[.,;।|]+$/, "");
  const put = (field: ImportField, value: string) => {
    const v = field === "name" || field === "fatherName" || field === "motherName" ? cleanName(value) : clean(value);
    if (v && !out[field]) out[field] = v;
  };
  const plain = (i: number) => Boolean(lines[i]) && !isLabel(lines[i]) && !isHeader(lines[i]) && !NOISE.test(lines[i]);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (NOISE.test(line)) { section = null; continue; }

    // "Personal/Bride Details of Miskatul Zannat", with the name on the same or the next line
    const titled = line.match(TITLE);
    if (titled) {
      if (titled[1]) put("kind", /bride/i.test(titled[1]) ? "patri" : "patro");
      const name = titled[2] || (plain(i + 1) ? lines[++i] : "");
      if (name) put("name", name);
      continue;
    }

    const header = SECTIONS.find((s) => s.re.test(line.replace(/\s*[:ঃ]\s*$/, "")));
    if (header) { section = header.field; continue; }

    const rule = LABELS.find((r) => r.re.test(line));
    if (rule) {
      // inside the family part, "Occupation: Army (retired)" is a parent's, not the person's
      if (section === "familyDetails" && (rule.field === "profession" || rule.field === "workplace" || rule.field === "monthlyIncome" || rule.field === "education")) {
        (sections.familyDetails ??= []).push(line);
        continue;
      }
      let value = line.replace(rule.re, "").replace(SEP, "").trim();
      const alone = !value;
      // a label alone on its line takes the next line as its value
      if (alone && plain(i + 1)) value = lines[++i];
      switch (rule.field) {
        case "dob": { const y = yearOf(value); if (y) put("birthYear", String(y)); break; }
        case "age": { const y = yearOf(`${value} years`); if (y && !out.birthYear) put("birthYear", String(y)); break; }
        case "height": { const cm = heightToCm(value); if (cm) put("heightCm", String(cm)); break; }
        case "weight": extras.push(`ওজন ${value}`); break;
        case "blood": extras.push(`রক্তের গ্রুপ ${value}`); break;
        case "complexion": extras.push(`গায়ের রং ${value}`); break;
        case "religion": { const r = religionOf(value); if (r) put("religion", r); break; }
        case "maritalStatus": { const m = maritalOf(value); if (m) put("maritalStatus", m); break; }
        case "monthlyIncome": { const n = value.replace(/[^\d]/g, ""); if (n) put("monthlyIncome", n); break; }
        case "phone": { const p = normalizePhone(value.replace(/[^\d+]/g, "")); if (p) put("guardianPhone", p); break; }
        case "workplace": if (clean(value)) out.profession = out.profession ? `${out.profession}, ${clean(value)}` : clean(value); break;
        case "permanent": case "present": case "address": {
          // an address often runs on to the next line: "House: 78, Ward: 3, Sarkarpara, Post.:" / "Lohagara, P.O.: Lohagara, Dist.: Narail."
          const parts = [value];
          while (plain(i + 1) && /[,:ঃ]/.test(lines[i + 1]) && parts.join(" ").length < 160) parts.push(lines[++i]);
          addresses[rule.field] = parts;
          section = null;
          break;
        }
        case "fatherName": case "motherName": {
          // "Md. Mizanur Rahman (Former Subeder, BGB-Rtd. 2017)" -> the name, and the rest to the family lines
          const m = value.match(/^([^(,]+?)\s*(?:\((.+)\)|,\s*(.+))?$/);
          put(rule.field, m?.[1] ?? value);
          const about = m?.[2] ?? m?.[3];
          if (about) extras.push(`${rule.field === "fatherName" ? "বাবা" : "মা"}: ${about.trim()}`);
          break;
        }
        // "Profession: Teacher" is the answer itself; "Education:" alone opens a part whose lines follow
        case "education": case "profession":
          if (!alone) put(rule.field, value);
          else if (value) (sections[rule.field] ??= []).push(value);
          section = rule.field;
          break;
        case "familyDetails": case "expectations":
          if (value) (sections[rule.field] ??= []).push(value);
          section = rule.field;
          break;
        default: put(rule.field, value);
      }
      continue;
    }

    if (section) {
      if (section === "permanent" || section === "present" || section === "address") (addresses[section] ??= []).push(line);
      else (sections[section] ??= []).push(line);
      continue;
    }
    // "Single", "Unmarried", "Muslim" on a line of their own
    const m = maritalOf(line); if (m && line.length < 24) { put("maritalStatus", m); continue; }
    const r = religionOf(line); if (r && line.length < 24) { put("religion", r); continue; }
  }

  if (sections.education?.length) put("education", tidyEducation(sections.education));
  if (sections.profession?.length && !out.profession) put("profession", sections.profession[0].replace(/\(\s*year.*?\)|\(\s*\d{4}.*?\)/i, "").trim());
  if (sections.expectations?.length) put("expectations", sections.expectations.join(" "));
  const family = [...(sections.familyDetails ?? []), ...extras];
  if (family.length) out.familyDetails = family.join("\n");

  // the permanent address is where a family is "from"; the present one is the fallback
  const addr = addresses.permanent ?? addresses.address ?? addresses.present;
  if (addr) applyAddress(out, addr.join(", "));
  if (out.district) { const d = districtOf(out.district); if (d) out.district = d; else delete out.district; }

  // any Bangladeshi mobile number anywhere, when no contact line named one
  if (!out.guardianPhone) {
    const p = text.match(/(?:\+?88)?0?1[3-9]\d{2}[\s-]?\d{3}[\s-]?\d{3}/);
    const phone = p && normalizePhone(p[0].replace(/[^\d+]/g, ""));
    if (phone) out.guardianPhone = phone;
  }
  if (!out.kind) {
    if (/\b(bride|daughter)\b|পাত্রী|কন্যা/i.test(text)) out.kind = "patri";
    else if (/\b(groom|son)\b|পাত্র(?!ী)/i.test(text)) out.kind = "patro";
  }
  return out;
}

/** "House: 78, Ward: 3, Sarkarpara, Post: Lohagara, P.O.: Lohagara, Dist.: Narail" -> village, upazila, district */
function applyAddress(out: Imported, address: string) {
  // "P.0." is OCR's "P.O."
  const skip = /^(?:house|holding|flat|road|ward|p\.?\s?[o0]\.?|post(?:\s*office)?|বাড়ি|হোল্ডিং|রোড|ওয়ার্ড|ডাকঘর|ডাক)\s*[:ঃ.\-]/i;
  const label = /^(?:village|vill\.?|upazil+a|thana|police station|p\.?s\.?|dist\.?|district|গ্রাম|উপজেলা|থানা|জেলা)\s*[:ঃ.\-]?\s*/i;
  // commas between Bangla place names often come back from OCR as "." or ":"
  const normalised = address.replace(/([ঀ-৿])\s*[.:]\s*(?=[ঀ-৿])/g, "$1, ");
  const raw = normalised.split(/[,،।;\n]+/).map((t) => t.trim()).filter(Boolean);
  // the post office is usually the upazila town: kept as a fallback when the address names nothing between village and district
  const postOffice = raw.map((t) => t.match(/^(?:p\.?\s?[o0]\.?|post(?:\s*office)?)\s*[:ঃ.\-]\s*(.+)$/i)?.[1]?.trim()).find(Boolean);
  const tokens = raw.filter((t) => !skip.test(t)).map((t) => t.replace(label, "").trim()).filter((t) => t && !/^\d+$/.test(t) && !/@/.test(t));
  if (!tokens.length) return;
  let districtAt = -1;
  for (let i = tokens.length - 1; i >= 0; i--) if (districtOf(tokens[i])) { districtAt = i; break; }
  if (districtAt >= 0) {
    if (!out.district) out.district = districtOf(tokens[districtAt])!;
    const before = tokens.slice(0, districtAt).filter((t) => squash(t) !== squash(tokens[districtAt]));
    if (before.length > 1) {
      if (!out.upazila) out.upazila = before[before.length - 1];
      if (!out.village) out.village = before[0];
    } else if (before.length === 1) {
      if (postOffice && !out.upazila) { out.upazila = postOffice; if (!out.village) out.village = before[0]; }
      else if (!out.upazila) out.upazila = before[0];
    }
  } else {
    if (!out.upazila && tokens.length > 1) out.upazila = tokens[tokens.length - 1];
    if (!out.village) out.village = tokens[0];
  }
}
