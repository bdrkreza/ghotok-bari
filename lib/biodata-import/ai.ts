import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AppError } from "../errors";
import type { Imported } from "./parse";

// The better reader, when the site has an AI key: the model looks at the photo, PDF or text and fills the same
// fields the rule-based parser does, handling handwriting, odd layouts and prose. Two providers:
//   GEMINI_API_KEY     Google's Gemini through its REST API. Its free tier (a key from AI Studio, no card) is enough
//                      for a village ghotok's handful of biodata a day. The default model is gemini-flash-lite-latest:
//                      it read a designed CV in two seconds, where the bigger Flash models thought for a minute, far
//                      too long for someone waiting at a form. (Older names like gemini-2.5-flash are refused for new
//                      keys, so the alias is also the safer default.)
//   ANTHROPIC_API_KEY  Claude, paid, the stronger reader; the default model is claude-opus-5-5.
// With both set, Claude is used. With neither, the button on the form uses the free, in-browser path
// (extract.ts + parse.ts) instead and nothing here runs. BIODATA_AI_MODEL overrides either default.

export type AiProvider = "anthropic" | "gemini";

export const aiProvider = (): AiProvider | null =>
  process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.GEMINI_API_KEY ? "gemini" : null;

export const aiAvailable = (): boolean => aiProvider() !== null;

const model = () => process.env.BIODATA_AI_MODEL || (aiProvider() === "gemini" ? "gemini-flash-lite-latest" : "claude-opus-5-5");

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
  education: z.string().nullable().describe("the highest degree and institution, in Bangla, e.g. মাস্টার্স, ঢাকা বিশ্ববিদ্যালয় (২০২১)"),
  profession: z.string().nullable().describe("in Bangla, e.g. প্রাথমিক বিদ্যালয়ের শিক্ষক"),
  monthlyIncome: z.string().nullable().describe("taka per month, digits only"),
  village: z.string().nullable().describe("village or area, Bangla spelling"),
  upazila: z.string().nullable().describe("upazila / thana, Bangla spelling"),
  district: z.string().nullable().describe("one of Bangladesh's 64 districts, Bangla spelling, e.g. নড়াইল"),
  guardianName: z.string().nullable().describe("whoever a ghotok should call, with the relation in brackets, e.g. মো. মিজানুর রহমান (বাবা)"),
  guardianPhone: z.string().nullable().describe("11 digits, 01XXXXXXXXX"),
  familyDetails: z.string().nullable().describe("parents' occupations, siblings, home, assets; Bangla, short lines"),
  expectations: z.string().nullable().describe("what the family wants in a match, in Bangla"),
  complexion: z.enum(["forsha", "ujjol_shyamla", "shyamla", "kalo"]).nullable().describe("forsha = fair, ujjol_shyamla = light brown / bright, shyamla = brown / wheatish, kalo = dark"),
  weightKg: z.string().nullable().describe("whole kilograms, digits only"),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).nullable(),
  educationMedium: z.enum(["general", "madrasa", "english"]).nullable().describe("madrasa for dakhil / alim / fazil / kamil, english for English medium or O/A levels, general when the document says so or the degrees are SSC/HSC/university"),
  workplace: z.string().nullable().describe("where they work, or one line about the work, in Bangla"),
  presentAddress: z.string().nullable().describe("the town or country they live in now, only when it differs from the permanent address; Bangla, short"),
  brothers: z.string().nullable().describe("number of brothers, digits only"),
  sisters: z.string().nullable().describe("number of sisters, digits only"),
  expectAgeMin: z.string().nullable().describe("the lowest age wanted in a match, digits only"),
  expectAgeMax: z.string().nullable().describe("the highest age wanted in a match, digits only"),
});

const SYSTEM = `You read a Bangladeshi marriage biodata (in Bangla, English or both; typed, or a photo of a printed or handwritten sheet) and fill a matchmaker's form.
Rules: copy only what the document says; leave a field null when it is absent or unreadable, never guess. Write free-text fields in Bangla (translate English; keep names in the script they are written in, Bangla preferred when both appear). Dates become the birth year only. Heights in feet and inches become centimetres. Addresses: prefer the permanent address; split it into village/area, upazila (thana) and district, with the district as one of the 64 districts in Bangla spelling. Blood group, weight, complexion, the medium of education, the workplace, the number of brothers and sisters and the age range hoped for each have a field of their own; fill presentAddress only when the person lives somewhere other than the permanent address. Contact numbers belong to the guardian. Do not invent a guardian or a phone number.`;

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

  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model()}:generateContent`, {
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
export function fieldsFromJson(raw: unknown): Imported {
  if (!raw || typeof raw !== "object") throw new AppError("import_failed", "ai: no object");
  const out: Imported = {};
  for (const [key, schema] of Object.entries(Fields.shape)) {
    let value = (raw as Record<string, unknown>)[key];
    if (typeof value === "number") value = String(value);
    const parsed = schema.safeParse(value);
    if (parsed.success && parsed.data !== null && String(parsed.data).trim()) out[key as keyof Imported] = String(parsed.data).trim();
  }
  if (!Object.keys(out).length) throw new AppError("import_failed", "ai: nothing read");
  return out;
}
