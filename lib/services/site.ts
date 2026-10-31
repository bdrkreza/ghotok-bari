import { eq } from "drizzle-orm";
import { z } from "zod";
import { normalizePhone } from "../auth/phone";
import type { Db } from "../db";
import { site, user, type Site } from "../db/schema";
import { AppError } from "../errors";
import { activeCounts } from "./profiles";

// The site row (lib/db/schema.ts): one per deployment, saying whose website this is and what the front page shows.
// getSite() takes no ghotokId, because this row is what tells the rest of the app who the ghotok is; it is the one
// unscoped read outside share.ts and holds nothing about any family.

const optional = (max: number) => z.string().trim().max(max).transform((s) => s || null);

const siteInput = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: optional(120),
  about: optional(2000),
  address: optional(160),
  whatsapp: z.string().trim().transform((s, ctx) => {
    if (!s) return null;
    const phone = normalizePhone(s);
    if (!phone) ctx.addIssue({ code: "custom", message: "phone" });
    return phone;
  }),
});

const FIELDS = Object.keys(siteInput.shape);

/** Raw form fields -> a validated row body; a missing field is read as empty. Throws AppError("invalid_input"). */
export function parseSite(raw: Record<string, string>) {
  const parsed = siteInput.safeParse(Object.fromEntries(FIELDS.map((k) => [k, raw[k] ?? ""])));
  if (!parsed.success) throw new AppError("invalid_input", parsed.error.message);
  return parsed.data;
}

/** The site, or null before /setup has been completed. */
export async function getSite(db: Db): Promise<Site | null> {
  return (await db.query.site.findFirst()) ?? null;
}

const isDuplicate = (e: unknown): boolean => {
  for (let x: unknown = e, i = 0; x && i < 4; x = (x as { cause?: unknown }).cause, i++) {
    if (/duplicate key|23505/.test(String((x as { message?: string }).message ?? ""))) return true;
  }
  return false;
};

/**
 * Make `ghotokId` the owner of this deployment, and an admin. Succeeds once; after that AppError("site_exists"),
 * whether the row was seen beforehand or a second setup raced this one to the single primary key.
 */
export async function createSite(db: Db, ghotokId: string, raw: Record<string, string>): Promise<void> {
  const data = parseSite(raw);
  if (await getSite(db)) throw new AppError("site_exists");
  try {
    await db.insert(site).values({ id: 1, ghotokId, ...data });
  } catch (e) {
    if (isDuplicate(e)) throw new AppError("site_exists");
    throw e;
  }
  await db.update(user).set({ role: "admin" }).where(eq(user.id, ghotokId));
}

/** The front page's words and the ghotok's contact details; only the owner may change them. */
export async function updateSite(db: Db, ghotokId: string, raw: Record<string, string>): Promise<void> {
  const data = parseSite(raw);
  const current = await getSite(db);
  if (!current || current.ghotokId !== ghotokId) throw new AppError("forbidden");
  await db.update(site).set(data).where(eq(site.id, current.id));
}

export interface PublicSite {
  name: string;
  /** the ghotok's own words; null means the page shows its stock line in the reader's language */
  tagline: string | null;
  about: string | null;
  address: string | null;
  /** the ghotok's login number: what families call */
  phone: string;
  /** the WhatsApp number, falling back to the phone */
  whatsapp: string;
  ghotokName: string;
  /** people still looking, as shown to visitors */
  patro: number;
  patri: number;
}

/** What the front page shows to anyone, signed in or not. Null before setup. */
export async function publicSite(db: Db): Promise<PublicSite | null> {
  const s = await getSite(db);
  if (!s) return null;
  const [[owner], counts] = await Promise.all([
    db.select({ name: user.name, phone: user.username }).from(user).where(eq(user.id, s.ghotokId)),
    activeCounts(db, s.ghotokId),
  ]);
  const phone = owner?.phone ?? "";
  return {
    name: s.name,
    tagline: s.tagline,
    about: s.about,
    address: s.address,
    phone,
    whatsapp: s.whatsapp ?? phone,
    ghotokName: owner?.name ?? "",
    ...counts,
  };
}
