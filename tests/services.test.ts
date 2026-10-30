import { beforeAll, describe, expect, it } from "vitest";
import { login } from "@/lib/auth/service";
import { roleOf } from "@/lib/auth/roles";
import { AppError } from "@/lib/errors";
import { biodataNo, bnNumber, initial, initials, taka } from "@/lib/bn";
import { listGhotoks, platformStats, setRole } from "@/lib/services/admin";
import { dashboard } from "@/lib/services/dashboard";
import { addEntry, listEntries, totals } from "@/lib/services/ledger";
import { suggestFor } from "@/lib/services/match";
import { listHref, parseAge } from "@/lib/search";
import { createProfile, getProfile, listProfiles, places, updateProfile } from "@/lib/services/profiles";
import { addNote, changeStatus, createProposal, getProposal, listProposals, proposalsFor } from "@/lib/services/proposals";
import { getShare, publicBiodata, shareBiodata, unshareBiodata } from "@/lib/services/share";
import { currentYear } from "@/lib/time";
import { createTestApp, personForm } from "./testdb";

type App = Awaited<ReturnType<typeof createTestApp>>;

const code = async (p: Promise<unknown>) => {
  try { await p; return null; } catch (e) { return e instanceof AppError ? e.code : `other:${String(e)}`; }
};

let app: App;
let ghotok: { id: string; phone: string; password: string };
let other: { id: string };

beforeAll(async () => {
  app = await createTestApp();
  ghotok = await app.makeGhotok("আব্দুল ঘটক");
  other = await app.makeGhotok("অন্য ঘটক");
});

describe("sign-in", () => {
  it("accepts the phone in any common spelling, and only with the right password", async () => {
    const deps = { auth: app.auth, headers: new Headers() };
    expect(await login(deps, { phone: ghotok.phone, password: "wrong-password" })).toEqual({ ok: false, code: "wrong_credentials" });
    expect(await login(deps, { phone: `+880 ${ghotok.phone.slice(1, 5)}-${ghotok.phone.slice(5)}`, password: ghotok.password })).toMatchObject({ ok: true });
    expect(await login(deps, { phone: ghotok.phone, password: ghotok.password, remember: false })).toMatchObject({ ok: true });
  });
});

describe("people", () => {
  it("enforces the legal minimum ages", async () => {
    const y = currentYear();
    expect(await code(createProfile(app.db, ghotok.id, personForm({ kind: "patro", birthYear: String(y - 20) })))).toBe("patro_too_young");
    expect(await code(createProfile(app.db, ghotok.id, personForm({ kind: "patri", birthYear: String(y - 17) })))).toBe("patri_too_young");
    expect(await code(createProfile(app.db, ghotok.id, personForm({ kind: "patro", birthYear: String(y - 21) })))).toBeNull();
    expect(await code(createProfile(app.db, ghotok.id, personForm({ kind: "patri", birthYear: String(y - 18), name: "আয়েশা" })))).toBeNull();
  });

  it("normalises what was typed and leaves blanks as null", async () => {
    const id = await createProfile(app.db, ghotok.id, personForm({
      name: "  সালাম মিয়া ", guardianPhone: "+880 1712-345678", heightCm: "১৬৮", monthlyIncome: "25,000".replace(",", ""), village: "",
    }));
    const p = await getProfile(app.db, ghotok.id, id);
    expect(p.name).toBe("সালাম মিয়া");
    expect(p.guardianPhone).toBe("01712345678");
    expect(p.heightCm).toBe(168);
    expect(p.monthlyIncome).toBe(25000);
    expect(p.village).toBeNull();
    expect(p.status).toBe("active");
  });

  it("rejects a bad guardian phone and a missing district", async () => {
    expect(await code(createProfile(app.db, ghotok.id, personForm({ guardianPhone: "12345" })))).toBe("invalid_input");
    expect(await code(createProfile(app.db, ghotok.id, personForm({ district: "" })))).toBe("invalid_input");
  });

  it("is scoped to the ghotok who wrote it", async () => {
    const id = await createProfile(app.db, ghotok.id, personForm({ name: "গোপন লোক" }));
    expect(await code(getProfile(app.db, other.id, id))).toBe("not_found");
    expect(await code(updateProfile(app.db, other.id, id, personForm({ name: "হ্যাক" })))).toBe("not_found");
    expect((await listProfiles(app.db, other.id, { kind: "patro" })).map((p) => p.id)).not.toContain(id);
  });

  it("searches by name or place", async () => {
    await createProfile(app.db, ghotok.id, personForm({ name: "জসিম", village: "মির্জাপুর", district: "টাঙ্গাইল" }));
    const byVillage = await listProfiles(app.db, ghotok.id, { kind: "patro", q: "মির্জা" });
    expect(byVillage.map((p) => p.name)).toEqual(["জসিম"]);
    const byName = await listProfiles(app.db, ghotok.id, { kind: "patro", q: "সালাম" });
    expect(byName).toHaveLength(1);
  });

  it("narrows by an age band and an exact place", async () => {
    const y = currentYear();
    await createProfile(app.db, ghotok.id, personForm({ kind: "patri", name: "তরুণী", birthYear: String(y - 20), district: "নোয়াখালী", upazila: "দাউদকান্দি" }));
    await createProfile(app.db, ghotok.id, personForm({ kind: "patri", name: "বয়োজ্যেষ্ঠা", birthYear: String(y - 34), district: "নোয়াখালী", upazila: "লাকসাম" }));
    const young = await listProfiles(app.db, ghotok.id, { kind: "patri", ageMin: 18, ageMax: 25, district: "নোয়াখালী" });
    expect(young.map((p) => p.name)).toEqual(["তরুণী"]);
    const inUpazila = await listProfiles(app.db, ghotok.id, { kind: "patri", upazila: "লাকসাম" });
    expect(inUpazila.map((p) => p.name)).toEqual(["বয়োজ্যেষ্ঠা"]);
    const seen = await places(app.db, ghotok.id);
    expect(seen).toContainEqual({ district: "নোয়াখালী", upazila: "লাকসাম" });
    expect(await places(app.db, other.id)).toEqual([]);
  });

  it("narrows by religion, marital status, height, income and a word in the profession", async () => {
    await createProfile(app.db, ghotok.id, personForm({ kind: "patro", name: "লম্বা শিক্ষক", heightCm: "175", monthlyIncome: "30000", profession: "স্কুল শিক্ষক", religion: "hindu", maritalStatus: "talakprapto" }));
    const names = async (f: Omit<Parameters<typeof listProfiles>[2], "kind">) => (await listProfiles(app.db, ghotok.id, { kind: "patro", ...f })).map((p) => p.name);
    expect(await names({ religion: "hindu", maritalStatus: "talakprapto" })).toEqual(["লম্বা শিক্ষক"]);
    expect(await names({ heightMin: 173 })).toEqual(["লম্বা শিক্ষক"]);
    expect(await names({ heightMax: 172 })).not.toContain("লম্বা শিক্ষক");
    expect(await names({ incomeMin: 26000 })).toEqual(["লম্বা শিক্ষক"]);
    expect(await names({ profession: "শিক্ষক" })).toEqual(["লম্বা শিক্ষক"]);
    expect((await names({ education: "এইচএসসি" })).length).toBeGreaterThan(1);
  });

  it("numbers people per kind as they are added, separately for each ghotok", async () => {
    const a = await getProfile(app.db, ghotok.id, await createProfile(app.db, ghotok.id, personForm({ kind: "patri", name: "নম্বর ক" })));
    const b = await getProfile(app.db, ghotok.id, await createProfile(app.db, ghotok.id, personForm({ kind: "patri", name: "নম্বর খ" })));
    expect(b.code).toBe(a.code + 1);
    const first = await getProfile(app.db, other.id, await createProfile(app.db, other.id, personForm({ kind: "patri", name: "অন্যের প্রথম" })));
    expect(first.code).toBe(1);
    expect((await listProfiles(app.db, ghotok.id, { kind: "patri", code: b.code })).map((p) => p.name)).toEqual(["নম্বর খ"]);
    expect(biodataNo("patri", 7)).toBe("পাত্রী-৭");
  });
});

describe("proposals", () => {
  let patro: string, patri: string, proposalId: string;

  beforeAll(async () => {
    patro = await createProfile(app.db, ghotok.id, personForm({ kind: "patro", name: "হাসান", birthYear: "1995", district: "ঢাকা", upazila: "সাভার" }));
    patri = await createProfile(app.db, ghotok.id, personForm({ kind: "patri", name: "ফাতেমা", birthYear: "2000", district: "ঢাকা", upazila: "সাভার" }));
  });

  it("needs one patro and one patri, once", async () => {
    const patro2 = await createProfile(app.db, ghotok.id, personForm({ kind: "patro", name: "আরেক পাত্র" }));
    expect(await code(createProposal(app.db, ghotok.id, { patroId: patro, patriId: patro2, note: "" }))).toBe("same_kind");
    proposalId = await createProposal(app.db, ghotok.id, { patroId: patro, patriId: patri, note: "মামার মাধ্যমে" });
    expect(await code(createProposal(app.db, ghotok.id, { patroId: patro, patriId: patri, note: "" }))).toBe("proposal_exists");
    const p = await getProposal(app.db, ghotok.id, proposalId);
    expect(p.status).toBe("prostab");
    expect(p.events).toHaveLength(1);
    expect(p.events[0]).toMatchObject({ kind: "created", toStatus: "prostab", note: "মামার মাধ্যমে" });
  });

  it("only moves along the allowed path and carries both people with it", async () => {
    expect(await code(changeStatus(app.db, ghotok.id, proposalId, "biye_hoyeche", ""))).toBe("bad_transition");
    await changeStatus(app.db, ghotok.id, proposalId, "kotha_cholche", "শুক্রবার বসবে");
    await changeStatus(app.db, ghotok.id, proposalId, "thik_hoyeche", "");
    expect((await getProfile(app.db, ghotok.id, patro)).status).toBe("engaged");
    expect((await getProfile(app.db, ghotok.id, patri)).status).toBe("engaged");

    await changeStatus(app.db, ghotok.id, proposalId, "bad", "কাবিন নিয়ে বনেনি");
    expect((await getProfile(app.db, ghotok.id, patro)).status).toBe("active");
    expect((await getProfile(app.db, ghotok.id, patri)).status).toBe("active");

    await changeStatus(app.db, ghotok.id, proposalId, "prostab", "আবার কথা শুরু");
    await changeStatus(app.db, ghotok.id, proposalId, "dekha_shona", "");
    await changeStatus(app.db, ghotok.id, proposalId, "thik_hoyeche", "");
    await changeStatus(app.db, ghotok.id, proposalId, "biye_hoyeche", "আলহামদুলিল্লাহ");
    expect((await getProfile(app.db, ghotok.id, patro)).status).toBe("married");
    expect((await getProfile(app.db, ghotok.id, patri)).status).toBe("married");

    const p = await getProposal(app.db, ghotok.id, proposalId);
    expect(p.events.map((e) => e.toStatus)).toEqual(["biye_hoyeche", "thik_hoyeche", "dekha_shona", "prostab", "bad", "thik_hoyeche", "kotha_cholche", "prostab"]);
  });

  it("keeps notes on the timeline and lists by stage", async () => {
    await addNote(app.db, ghotok.id, proposalId, "বিয়ের তারিখ ১২ তারিখ");
    expect(await code(addNote(app.db, ghotok.id, proposalId, "   "))).toBe("invalid_input");
    const p = await getProposal(app.db, ghotok.id, proposalId);
    expect(p.events[0]).toMatchObject({ kind: "note", note: "বিয়ের তারিখ ১২ তারিখ" });

    expect((await listProposals(app.db, ghotok.id, "live")).map((r) => r.id)).not.toContain(proposalId);
    expect((await listProposals(app.db, ghotok.id, "biye_hoyeche")).map((r) => r.id)).toContain(proposalId);
    expect((await proposalsFor(app.db, ghotok.id, patri)).map((r) => r.id)).toEqual([proposalId]);
    expect(await code(getProposal(app.db, other.id, proposalId))).toBe("not_found");
  });

  it("suggests people of the same religion, nearest first, skipping pairs already proposed", async () => {
    const seeker = await createProfile(app.db, ghotok.id, personForm({ kind: "patri", name: "নাজমা", birthYear: "1999", district: "ঢাকা", upazila: "ধামরাই", education: "এইচএসসি" }));
    const near = await createProfile(app.db, ghotok.id, personForm({ kind: "patro", name: "কাছের পাত্র", birthYear: "1994", district: "ঢাকা", upazila: "ধামরাই", education: "এইচএসসি" }));
    const far = await createProfile(app.db, ghotok.id, personForm({ kind: "patro", name: "দূরের পাত্র", birthYear: "1990", district: "রংপুর", education: "এসএসসি" }));
    await createProfile(app.db, ghotok.id, personForm({ kind: "patro", name: "অন্য ধর্ম", religion: "hindu", district: "ঢাকা", upazila: "ধামরাই" }));
    const proposed = await createProfile(app.db, ghotok.id, personForm({ kind: "patro", name: "আগেই প্রস্তাব", district: "ঢাকা", upazila: "ধামরাই" }));
    await createProposal(app.db, ghotok.id, { patroId: proposed, patriId: seeker, note: "" });

    // a high limit, so the far-away patro is in the list and its score can be compared
    const list = await suggestFor(app.db, ghotok.id, await getProfile(app.db, ghotok.id, seeker), 50);
    const names = list.map((s) => s.candidate.name);
    expect(names[0]).toBe("কাছের পাত্র");
    expect(names).not.toContain("অন্য ধর্ম");
    expect(names).not.toContain("আগেই প্রস্তাব");
    expect(names).not.toContain("হাসান"); // married by now
    expect(list[0].reasons).toEqual(expect.arrayContaining(["একই জেলা", "একই উপজেলা", "একই শিক্ষা"]));
    expect(list.find((s) => s.candidate.id === far)!.score).toBeLessThan(list.find((s) => s.candidate.id === near)!.score);
  });
});

describe("ledger", () => {
  it("adds up agreed, received and spent money, reading Bangla digits", async () => {
    // the wedding that went through (হাসান ও ফাতেমা)
    const [p] = await listProposals(app.db, ghotok.id, "biye_hoyeche");
    await addEntry(app.db, ghotok.id, { kind: "chukti", amount: "২০,০০০", entryDate: "2026-10-01", proposalId: p.id, note: "দুই পক্ষ মিলে" });
    await addEntry(app.db, ghotok.id, { kind: "joma", amount: "5000", entryDate: "2026-10-05", proposalId: p.id, note: "অগ্রিম" });
    await addEntry(app.db, ghotok.id, { kind: "khoroch", amount: "800", note: "যাতায়াত" });
    expect(await code(addEntry(app.db, ghotok.id, { kind: "joma", amount: "0" }))).toBe("amount_required");
    expect(await code(addEntry(app.db, ghotok.id, { kind: "joma", amount: "abc" }))).toBe("amount_required");
    expect(await code(addEntry(app.db, other.id, { kind: "joma", amount: "100", proposalId: p.id }))).toBe("not_found");

    const t = await totals(app.db, ghotok.id);
    expect(t).toEqual({ chukti: 20000, joma: 5000, khoroch: 800, baki: 15000, labh: 4200 });
    const rows = await listEntries(app.db, ghotok.id);
    expect(rows).toHaveLength(3);
    expect(rows[1].proposal?.patro.name).toBe("হাসান");
    expect(await totals(app.db, other.id)).toEqual({ chukti: 0, joma: 0, khoroch: 0, baki: 0, labh: 0 });
  });

  it("formats money the Bangladeshi way", () => {
    expect(bnNumber(1234567)).toBe("১২,৩৪,৫৬৭");
    expect(taka(5000)).toBe("৳৫,০০০");
    expect(taka(0)).toBe("৳০");
  });
});

describe("dashboard", () => {
  it("counts only people still looking and proposals still live", async () => {
    const d = await dashboard(app.db, ghotok.id);
    expect(d.patro).toBeGreaterThan(0);
    expect(d.fixed).toBe(1);
    expect(d.live).toBe(1);
    expect(d.recent.every((r) => ["prostab", "dekha_shona", "kotha_cholche", "thik_hoyeche"].includes(r.status))).toBe(true);
    expect(d.money.baki).toBe(15000);
    expect(d.people.length).toBeGreaterThan(0);
    expect(d.people.length).toBeLessThanOrEqual(6);
    expect(d.places.some((p) => p.district === "ঢাকা")).toBe(true);
  });
});

describe("search bar", () => {
  it("reads an age band from the URL, builds a list link and takes Bangla initials", () => {
    expect(parseAge("18-25")).toEqual({ min: 18, max: 25 });
    expect(parseAge("41-")).toEqual({ min: 41 });
    expect(parseAge("abc")).toBeNull();
    expect(parseAge(undefined)).toBeNull();
    expect(listHref("patri", { age: "18-25", district: "নোয়াখালী", upazila: "" })).toBe(`/patri?age=18-25&district=${encodeURIComponent("নোয়াখালী")}`);
    expect(listHref("patro", {})).toBe("/patro");
    expect(initial("রুমা খাতুন")).toBe("রু");
    expect(initials("আব্দুল করিম ঘটক")).toBe("আক");
    expect(initials("  ")).toBe("?");
  });
});

describe("sharing a biodata", () => {
  it("shows only the agreed fields behind a random token, and stops when switched off", async () => {
    const id = await createProfile(app.db, ghotok.id, personForm({
      kind: "patri", name: "গোপন নাম", guardianPhone: "01811111111", monthlyIncome: "12000", notes: "ব্যক্তিগত নোট", familyDetails: "সম্ভ্রান্ত পরিবার", heightCm: "160",
    }));
    expect(await getShare(app.db, ghotok.id, id)).toBeNull();
    const token = await shareBiodata(app.db, ghotok.id, id);
    expect(token).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(await shareBiodata(app.db, ghotok.id, id)).toBe(token); // a second switch-on keeps the same link
    expect(await code(shareBiodata(app.db, other.id, id))).toBe("not_found");

    const pub = await publicBiodata(app.db, token);
    expect(pub).toMatchObject({ kind: "patri", heightCm: 160, familyDetails: "সম্ভ্রান্ত পরিবার", district: "কুমিল্লা", ghotok: { name: "আব্দুল ঘটক", phone: ghotok.phone } });
    const shown = JSON.stringify(pub);
    for (const secret of ["গোপন নাম", "01811111111", "12000", "ব্যক্তিগত নোট", "চরপাড়া", "করিম উদ্দিন"]) expect(shown).not.toContain(secret);
    expect(await publicBiodata(app.db, "nope")).toBeNull();

    await unshareBiodata(app.db, other.id, id); // another ghotok's switch does nothing
    expect(await publicBiodata(app.db, token)).not.toBeNull();
    await unshareBiodata(app.db, ghotok.id, id);
    expect(await publicBiodata(app.db, token)).toBeNull();
    expect(await getShare(app.db, ghotok.id, id)).toBeNull();
  });
});

describe("roles and the admin view", () => {
  const as = (id: string, phone: string, role: "ghotok" | "admin"): { id: string; name: string; phone: string; role: "ghotok" | "admin" } => ({ id, name: "x", phone, role });

  it("is ghotok by default, admin through ADMIN_PHONES, and keeps the admin view locked", async () => {
    expect(await roleOf(app.db, ghotok.id)).toBe("ghotok");
    process.env.ADMIN_PHONES = ` ${ghotok.phone} , nonsense`;
    expect(await roleOf(app.db, ghotok.id)).toBe("admin");
    expect(await roleOf(app.db, other.id)).toBe("ghotok");
    delete process.env.ADMIN_PHONES;
    expect(await roleOf(app.db, ghotok.id)).toBe("ghotok");
    expect(await code(platformStats(app.db, as(other.id, "0", "ghotok")))).toBe("forbidden");
    expect(await code(listGhotoks(app.db, as(other.id, "0", "ghotok")))).toBe("forbidden");
  });

  it("counts across ghotoks and lets an admin promote others, never themselves", async () => {
    await setRole(app.db, as(ghotok.id, ghotok.phone, "admin"), other.id, "admin");
    expect(await roleOf(app.db, other.id)).toBe("admin");
    const admin = as(other.id, "0", "admin");

    const stats = await platformStats(app.db, admin);
    expect(stats.ghotoks).toBe(2);
    expect(stats.marriages).toBeGreaterThanOrEqual(1);
    expect(stats.joma).toBe(5000);

    const rows = await listGhotoks(app.db, admin);
    expect(rows.map((r) => r.id).sort()).toEqual([ghotok.id, other.id].sort());
    const mine = rows.find((r) => r.id === ghotok.id)!;
    expect(mine.profiles).toBeGreaterThan(5);
    expect(mine.joma).toBe(5000);
    expect(mine.role).toBe("ghotok");
    expect((await listGhotoks(app.db, admin, "অন্য")).map((r) => r.id)).toEqual([other.id]);

    expect(await code(setRole(app.db, admin, other.id, "ghotok"))).toBe("self_role");
    expect(await code(setRole(app.db, admin, "no-such-id", "admin"))).toBe("not_found");
    await setRole(app.db, admin, ghotok.id, "admin");
    expect(await roleOf(app.db, ghotok.id)).toBe("admin");
    await setRole(app.db, admin, ghotok.id, "ghotok");
    expect(await roleOf(app.db, ghotok.id)).toBe("ghotok");
  });
});
