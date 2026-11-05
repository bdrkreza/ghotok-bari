import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AppError } from "../errors";
import type { Imported } from "./parse";

// The better reader, when the site has an AI key: the model looks at the photo, PDF or text and fills the same
// fields the rule-based parser does, handling handwriting, odd layouts and prose. Two providers:
//   GEMINI_API_KEY     Google's Gemini through its REST API. Its free tier (a key from AI Studio, no card) is enough
//                      for a village ghotok's handful of biodata a day. The default model is gemini-3.5-flash-lite:
//                      on two real biodata photos (November 2026) it read both in 2-8 seconds every time, with the
//                      education in parts right, where gemini-flash-lite-latest was often "busy" (503) and the bigger
//                      Flash models (gemini-flash-latest, gemini-3.8-flash) ran past the 45 seconds a form can wait.
//                      Should Google retire that name (404), the call falls back to the gemini-flash-lite-latest alias.
//   ANTHROPIC_API_KEY  Claude, paid, the stronger reader; the default model is claude-opus-5-5.
// With both set, Claude is used. With neither, the button on the form uses the free, in-browser path
// (extract.ts + parse.ts) instead and nothing here runs. BIODATA_AI_MODEL overrides either default.

export type AiProvider = "anthropic" | "gemini";

export const aiProvider = (): AiProvider | null =>
  process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.GEMINI_API_KEY ? "gemini" : null;

export const aiAvailable = (): boolean => aiProvider() !== null;

const GEMINI_DEFAULT = "gemini-3.5-flash-lite";
/** The alias that always names Google's current Flash-Lite, for when the default above has been retired. */
const GEMINI_FALLBACK = "gemini-flash-lite-latest";
const model = () => process.env.BIODATA_AI_MODEL || (aiProvider() === "gemini" ? GEMINI_DEFAULT : "claude-opus-5-5");

/** How long a reading may take before the browser is better off reading the file itself. */
const AI_TIMEOUT_MS = 45_000;

/** The form's fields; null where the document says nothing. Zod keeps the model's answer in this exact shape. */
const Fields = z.object({
  kind: z.enum(["patro", "patri"]).nullable().describe("patri for a bride / female, patro for a groom / male"),
  name: z.string().nullable(),
  fatherName: z.string().nullable(),
  motherName: z.string().nullable(),
  birthYear: z.string().nullable().describe("four digits, e.g. 1998"),
  heightCm: z.string().nullable().describe("whole centimetres, e.g. 5'3\" -> 160"),
  religion: z.enum(["islam", "hindu", "christian", "buddhist", "other"]).nullable(),
  maritalStatus: z.enum(["obibahito", "talakprapto", "bidhoba"]).nullable().describe("obibahito = never married, talakprapto = divorced, bidhoba = widowed"),
  education: z.string().nullable().describe("one short line in Bangla: the highest degree with its subject, e.g. স্নাতক (টেক্সটাইল ইঞ্জিনিয়ারিং); the institution, year and result go in their own fields"),
  educationLevel: z.enum(["ssc", "hsc", "diploma", "bachelor", "master", "phd", "dakhil", "alim", "fazil", "kamil", "hafez", "other"]).nullable()
    .describe("the highest level reached: honours or any bachelor's degree is bachelor, masters / MBA / M.Sc is master; madrasa levels are dakhil, alim, fazil, kamil"),
  educationSubject: z.string().nullable().describe("the subject or department of the highest degree, as written, e.g. Textile Engineering"),
  educationInstitution: z.string().nullable().describe("the university, college or madrasa of the highest degree, its name as written"),
  educationYear: z.string().nullable().describe("four digits: the year the highest degree was finished, or will be when still studying (the end of a range like 2020-2024)"),
  educationStudying: z.enum(["true"]).nullable().describe("\"true\" only when the highest degree is still going on, otherwise null"),
  educationResult: z.string().nullable().describe("the result of the highest degree as written, e.g. CGPA 3.71, First division"),
  sscYear: z.string().nullable().describe("four digits: the year SSC or Dakhil was passed"),
  sscGroup: z.enum(["science", "humanities", "commerce", "vocational", "other"]).nullable().describe("the SSC / Dakhil group; arts is humanities, business is commerce"),
  hscYear: z.string().nullable().describe("four digits: the year HSC or Alim was passed"),
  hscGroup: z.enum(["science", "humanities", "commerce", "vocational", "other"]).nullable().describe("the HSC / Alim group; arts is humanities, business is commerce"),
  profession: z.string().nullable().describe("in Bangla, e.g. প্রাথমিক বিদ্যালয়ের শিক্ষক"),
  monthlyIncome: z.string().nullable().describe("taka per month, digits only"),
  village: z.string().nullable().describe("the village, para or area name alone, Bangla spelling; never a house number, ward, road or post office"),
  upazila: z.string().nullable().describe("upazila / thana, Bangla spelling"),
  district: z.string().nullable().describe("one of Bangladesh's 64 districts, Bangla spelling, e.g. নড়াইল"),
  guardianName: z.string().nullable().describe("whoever a ghotok should call, with the relation in brackets, e.g. মো. মিজানুর রহমান (বাবা)"),
  guardianPhone: z.string().nullable().describe("11 digits, 01XXXXXXXXX"),
  familyDetails: z.string().nullable().describe("one short Bangla line per person: parents' occupations, then each brother and sister with what they do, then home and assets. A brother's wife or a sister's husband is an in-law, not a sibling; any count you write must agree with brothers and sisters"),
  expectations: z.string().nullable().describe("what the family wants in a match, in Bangla"),
  complexion: z.enum(["forsha", "ujjol_shyamla", "shyamla", "kalo"]).nullable().describe("forsha = fair, ujjol_shyamla = light brown / bright, shyamla = brown / wheatish, kalo = dark"),
  weightKg: z.string().nullable().describe("whole kilograms, digits only"),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).nullable(),
  educationMedium: z.enum(["general", "madrasa", "english"]).nullable().describe("madrasa for dakhil / alim / fazil / kamil, english for English medium or O/A levels, general when the document says so or the degrees are SSC/HSC/university"),
  workplace: z.string().nullable().describe("where they work, or one line about the work, in Bangla"),
  presentAddress: z.string().nullable().describe("the town or country they live in now, only when it differs from the permanent address; Bangla, short"),
  brothers: z.string().nullable().describe("how many brothers, elder and younger together, not counting the person or any in-law; digits only. null when the document does not mention brothers at all (0 only when it says there are none)"),
  sisters: z.string().nullable().describe("how many sisters, elder and younger together, not counting the person or any in-law (a sister-in-law is not a sister); digits only. null when the document does not mention sisters at all (0 only when it says there are none)"),
  expectAgeMin: z.string().nullable().describe("the lowest age wanted in a match, digits only"),
  expectAgeMax: z.string().nullable().describe("the highest age wanted in a match, digits only"),
});

const SYSTEM = `You read a Bangladeshi marriage biodata (in Bangla, English or both; typed, or a photo of a printed or handwritten sheet) and fill a matchmaker's form.
Rules: copy only what the document says; leave a field null when it is absent or unreadable, never guess. Write free-text fields in Bangla (translate English; keep names in the script they are written in, Bangla preferred when both appear). Dates become the birth year only. Heights in feet and inches become centimetres. Addresses: prefer the permanent address; split it into village/area, upazila (thana) and district, with the district as one of the 64 districts in Bangla spelling. Blood group, weight, complexion, the medium of education, the level and parts of the education (subject, institution, year, result, and the SSC and HSC year and group), the workplace, the number of brothers and sisters and the age range hoped for each have a field of their own; fill presentAddress only when the person lives somewhere other than the permanent address. Contact numbers belong to the guardian. Do not invent a guardian or a phone number.`;

type Input =
  | { type: "image"; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: Buffer }
  | { type: "pdf"; data: Buffer }
  | { type: "text"; text: string };

/** The fields the model read, with nulls dropped. Throws AppError("import_failed") when the model declines or returns nothing usable. */
export async function extractWithAi(input: Input): Promise<Imported> {
  return aiProvider() === "gemini" ? withGemini(input) : withClaude(input);
}

async function withClaude(input: Input): Promise<Imported> {
  const client = new Anthropic();
  const content: Anthropic.ContentBlockParam[] =
    input.type === "image"
      ? [{ type: "image", source: { type: "base64", media_type: input.mediaType, data: input.data.toString("base64") } }]
      : input.type === "pdf"
        ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: input.data.toString("base64") } }]
        : [{ type: "text", text: `The biodata's text:\n\n${input.text}` }];
  content.push({ type: "text", text: "Fill the form fields from this biodata." });

  const response = await client.messages.parse({
    model: model(),
    max_tokens: 4000,
    system: SYSTEM,
    output_config: { effort: "medium", format: zodOutputFormat(Fields) },
    messages: [{ role: "user", content }],
  }, { timeout: AI_TIMEOUT_MS });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new AppError("import_failed");
  return fieldsFromJson(response.parsed_output);
}

/** The keys the model must answer with, with their meaning and allowed values, for a prompt. */
function keyList(): string {
  const schema = z.toJSONSchema(Fields) as { properties?: Record<string, { description?: string; anyOf?: { enum?: string[] }[]; enum?: string[] }> };
  return Object.entries(schema.properties ?? {}).map(([key, p]) => {
    const values = p.enum ?? p.anyOf?.flatMap((a) => a.enum ?? []);
    const about = [p.description, values?.length ? `one of ${values.join(" | ")}` : null].filter(Boolean).join("; ");
    return `- ${key}${about ? `: ${about}` : ""}`;
  }).join("\n");
}

async function withGemini(input: Input): Promise<Imported> {
  const parts: Record<string, unknown>[] =
    input.type === "text"
      ? [{ text: `The biodata's text:\n\n${input.text}` }]
      : [{ inline_data: { mime_type: input.type === "pdf" ? "application/pdf" : input.mediaType, data: input.data.toString("base64") } }];
  parts.push({ text: `Fill the form fields from this biodata. Answer with one JSON object and nothing else, with exactly these keys (every key present, null where the document says nothing):\n${keyList()}` });

  // one model, with one more try after a short wait when it is busy
  const ask = async (name: string): Promise<Response> => {
    let res: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 2000));
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${name}:generateContent`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM }] },
            contents: [{ role: "user", parts }],
            generationConfig: { response_mime_type: "application/json", temperature: 0 },
          }),
          signal: AbortSignal.timeout(AI_TIMEOUT_MS),
        });
      } catch (e) {
        // no network, or the model took too long: the browser reads the file itself
        throw new AppError("ai_busy", `gemini: ${e instanceof Error ? e.name : "fetch failed"}`);
      }
      // busy right now: one more try after a short wait, then the browser takes over
      if (res.status !== 503) break;
    }
    if (!res) throw new AppError("ai_busy", "gemini: no answer");
    return res;
  };
  let res = await ask(model());
  // the default model's name retired by Google: the alias for the current Flash-Lite instead
  if (res.status === 404 && !process.env.BIODATA_AI_MODEL) res = await ask(GEMINI_FALLBACK);
  // the free tier's quota: a handful a minute; the browser falls back to reading the file itself
  if (res.status === 429 || res.status === 503) throw new AppError("ai_busy", `gemini ${res.status}`);
  if (!res.ok) throw new AppError("import_failed", `gemini ${res.status} ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new AppError("import_failed", "gemini: not json"); }
  return fieldsFromJson(raw);
}

/**
 * The model's JSON as form fields: each key checked on its own against the schema (a wrong enum value or a number
 * where a string belongs drops that field, not the whole answer), nulls and blanks left out, everything a string.
 */
const NAMES = new Set(["name", "fatherName", "motherName", "guardianName"]);

export function fieldsFromJson(raw: unknown): Imported {
  if (!raw || typeof raw !== "object") throw new AppError("import_failed", "ai: no object");
  const out: Imported = {};
  for (const [key, schema] of Object.entries(Fields.shape)) {
    let value = (raw as Record<string, unknown>)[key];
    if (typeof value === "number") value = String(value);
    if (typeof value === "boolean") value = value ? "true" : null;
    const parsed = schema.safeParse(value);
    if (!parsed.success || parsed.data === null || !String(parsed.data).trim()) continue;
    let text = String(parsed.data).trim();
    // a name copied off a heading in capitals ("MST. JANNATL FERDOUSHI") reads better as "Mst. Jannatl Ferdoushi"
    if (NAMES.has(key) && /[A-Z]/.test(text) && text === text.toUpperCase()) text = text.toLowerCase().replace(/(^|[\s.(])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
    out[key as keyof Imported] = text;
  }
  if (!Object.keys(out).length) throw new AppError("import_failed", "ai: nothing read");
  return out;
}
