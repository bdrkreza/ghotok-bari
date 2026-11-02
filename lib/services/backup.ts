import { eq, inArray } from "drizzle-orm";
import type { Db } from "../db";
import { biodataShare, interest, ledgerEntry, profile, profilePhoto, proposal, proposalEvent, site } from "../db/schema";

// The ghotok's own copy of everything on the site, downloaded from settings (/api/backup). Every row belongs to this
// ghotok; accounts and passwords are not included (they are not the ghotok's records), nor the photo files
// themselves, only where each one is kept.

export async function exportAll(db: Db, ghotokId: string) {
  const [siteRow, profiles, photos, shares, proposals, ledger, interests] = await Promise.all([
    db.select().from(site).where(eq(site.ghotokId, ghotokId)),
    db.select().from(profile).where(eq(profile.ghotokId, ghotokId)).orderBy(profile.kind, profile.code),
    db.select().from(profilePhoto).where(eq(profilePhoto.ghotokId, ghotokId)),
    db.select().from(biodataShare).where(eq(biodataShare.ghotokId, ghotokId)),
    db.select().from(proposal).where(eq(proposal.ghotokId, ghotokId)),
    db.select().from(ledgerEntry).where(eq(ledgerEntry.ghotokId, ghotokId)).orderBy(ledgerEntry.entryDate),
    db.select().from(interest).where(eq(interest.ghotokId, ghotokId)),
  ]);
  const events = proposals.length
    ? await db.select().from(proposalEvent).where(inArray(proposalEvent.proposalId, proposals.map((p) => p.id))).orderBy(proposalEvent.createdAt)
    : [];
  return {
    app: "alta",
    version: 1,
    exportedAt: new Date().toISOString(),
    site: siteRow[0] ?? null,
    profiles, photos, shares, proposals, proposalEvents: events, ledger, interests,
  };
}

/** The columns of the people sheet, in order: [header, value]. Headers are passed in so they follow the language. */
const PEOPLE: readonly (keyof typeof profile.$inferSelect)[] = [
  "kind", "code", "name", "fatherName", "motherName", "birthYear", "heightCm", "religion", "maritalStatus", "education", "profession",
  "monthlyIncome", "village", "upazila", "district", "presentAddress", "guardianName", "guardianPhone", "status", "approval", "notes", "createdAt",
];

const cell = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Everyone on the site as a CSV that opens in Excel: one row per person. Starts with a byte-order mark so Excel reads
 * the Bangla as UTF-8. `header` gives each column's title in the reader's language.
 */
export async function peopleCsv(db: Db, ghotokId: string, header: (column: string) => string): Promise<string> {
  const rows = await db.select().from(profile).where(eq(profile.ghotokId, ghotokId)).orderBy(profile.kind, profile.code);
  const lines = [PEOPLE.map((c) => cell(header(c))).join(","), ...rows.map((r) => PEOPLE.map((c) => cell(r[c])).join(","))];
  return `﻿${lines.join("\r\n")}\r\n`;
}
