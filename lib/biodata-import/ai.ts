import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AppError } from "../errors";
import type { Imported } from "./parse";

// The better reader, when the site has an Anthropic API key: Claude looks at the photo, PDF or text and fills the
// same fields the rule-based parser does, handling handwriting, odd layouts and prose. Without a key the button on
// the form uses the free, in-browser path (extract.ts + parse.ts) instead; nothing here runs.

export const aiAvailable = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);

const model = () => process.env.BIODATA_AI_MODEL || "claude-opus-5-5";

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
  familyDetails: z.string().nullable().describe("parents' occupations, siblings, home, plus blood group, weight, complexion if given; Bangla, short lines"),
  expectations: z.string().nullable().describe("what the family wants in a match, in Bangla"),
});

const SYSTEM = `You read a Bangladeshi marriage biodata (in Bangla, English or both; typed, or a photo of a printed or handwritten sheet) and fill a matchmaker's form.
Rules: copy only what the document says; leave a field null when it is absent or unreadable, never guess. Write free-text fields in Bangla (translate English; keep names in the script they are written in, Bangla preferred when both appear). Dates become the birth year only. Heights in feet and inches become centimetres. Addresses: prefer the permanent address; split it into village/area, upazila (thana) and district, with the district as one of the 64 districts in Bangla spelling. Put blood group, weight and complexion into familyDetails as short lines, since the form has no fields for them. Contact numbers belong to the guardian. Do not invent a guardian or a phone number.`;

type Input =
  | { type: "image"; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: Buffer }
  | { type: "pdf"; data: Buffer }
  | { type: "text"; text: string };

/** The fields Claude read, with nulls dropped. Throws AppError("import_failed") when the model declines or returns nothing usable. */
export async function extractWithAi(input: Input): Promise<Imported> {
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
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new AppError("import_failed");

  const out: Imported = {};
  for (const [k, v] of Object.entries(response.parsed_output)) if (v) out[k as keyof Imported] = String(v).trim();
  return out;
}
