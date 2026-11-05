import { beforeAll, describe, expect, it } from "vitest";
import type { AdminSession } from "@/lib/auth/session";
import { changePassword, login } from "@/lib/auth/service";
import { IP_LIMIT, PHONE_LIMIT, SIGNUP_LIMIT, isLockedOut, recordFailure, recordSignup, signupLimited } from "@/lib/auth/throttle";
import { AppError } from "@/lib/errors";
import { listActivity, logActivity } from "@/lib/services/activity";
import { exportAll, peopleCsv } from "@/lib/services/backup";
import { submitBiodata } from "@/lib/services/biodata";
import { resetPassword } from "@/lib/services/customers";
import {
  expressInterest, isFavorite, listInterests, myFavorites, myInterestIn, myInterests, newInterestCount, proposeFromInterest,
  setInterestStatus, toggleFavorite, withdrawInterest,
} from "@/lib/services/interests";
import { addEntry, dues, monthly } from "@/lib/services/ledger";
import { matchesForFamily } from "@/lib/services/match";
import { dismissNotice, notify, recentNotices, unreadCount, unreadNotices } from "@/lib/services/notices";
import { createProfile, setApproval } from "@/lib/services/profiles";
import { changeStatus, dueFollowUps, getProposal, setFollowUp } from "@/lib/services/proposals";
import { listProfileEvents, myBiodataStats, recordProfileEvent, weekEventCounts } from "@/lib/services/views";
import { today } from "@/lib/time";
import { createTestApp, personForm } from "./testdb";

// The features around the core: families' interest and short list, notices, follow-ups, dues and the monthly
// summary, password reset and change, sign-in throttling, the activity log, who looked at which biodata, and the backup.

type App = Awaited<ReturnType<typeof createTestApp>>;

const code = async (p: Promise<unknown>) => {
  try { await p; return null; } catch (e) { return e instanceof AppError ? e.code : `other:${String(e)}`; }
};

let app: App;
let ghotok: { id: string; phone: string; password: string };
let family: { id: string; phone: string; password: string };
let stranger: { id: string; phone: string; password: string };
let owner: AdminSession;
/** the family's own son, listed */
let son: string;
/** a bride the ghotok wrote, listed */
let bride: string;
/** a bride still pending */
let pending: string;

beforeAll(async () => {
  app = await createTestApp();
  ghotok = await app.makeUser("আব্দুল ঘটক");
  family = await app.makeUser("রহিমা বেগম");
  stranger = await app.makeUser("অন্য পরিবার");
  owner = { id: ghotok.id, name: "আব্দুল ঘটক", phone: ghotok.phone, role: "admin", ghotokId: ghotok.id };
  son = await submitBiodata(app.db, ghotok.id, family.id, personForm({ kind: "patro", name: "রাকিব", birthYear: "1996", district: "কুমিল্লা", expectDistricts: "কুমিল্লা" }));
  await setApproval(app.db, ghotok.id, son, "approved");
  bride = await createProfile(app.db, ghotok.id, personForm({ kind: "patri", name: "নুসরাত জাহান", birthYear: "2001", district: "কুমিল্লা", guardianPhone: "01822222222" }));
  pending = await submitBiodata(app.db, ghotok.id, stranger.id, personForm({ kind: "patri", name: "অপেক্ষমাণ", birthYear: "2002" }));
});

describe("notices", () => {
  it("tell a family when their biodata is listed or returned, until they dismiss them", async () => {
    const mine = await unreadNotices(app.db, ghotok.id, family.id);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ kind: "approved", profileId: son, profileKind: "patro", ownedBy: family.id });
    await setApproval(app.db, ghotok.id, pending, "returned", "ছবি দিন");
    expect((await unreadNotices(app.db, ghotok.id, stranger.id))[0]).toMatchObject({ kind: "returned", note: "ছবি দিন" });
    // the ghotok's own entries have nobody to tell
    await setApproval(app.db, ghotok.id, bride, "approved");
    expect(await unreadNotices(app.db, ghotok.id, ghotok.id)).toHaveLength(0);
    // someone else's notice cannot be dismissed
    await dismissNotice(app.db, ghotok.id, stranger.id, mine[0].id);
    expect(await unreadNotices(app.db, ghotok.id, family.id)).toHaveLength(1);
    await dismissNotice(app.db, ghotok.id, family.id);
    expect(await unreadNotices(app.db, ghotok.id, family.id)).toHaveLength(0);
  });

  it("counts every unread one for the bell, past the fifty its list holds", async () => {
    for (let i = 0; i < 105; i++) await notify(app.db, ghotok.id, family.id, "approved", son);
    expect(await unreadCount(app.db, ghotok.id, family.id)).toBe(105);
    expect(await unreadNotices(app.db, ghotok.id, family.id, 50)).toHaveLength(50);
    expect(await unreadCount(app.db, ghotok.id, stranger.id)).toBe(1); // the returned one from above, theirs alone
    await dismissNotice(app.db, ghotok.id, family.id);
    expect(await unreadCount(app.db, ghotok.id, family.id)).toBe(0);
    // seen ones stay in the bell's list, marked seen, newest first; nobody else's are there
    const kept = await recentNotices(app.db, ghotok.id, family.id, 50);
    expect(kept).toHaveLength(50);
    expect(kept.every((n) => n.readAt !== null)).toBe(true);
    await notify(app.db, ghotok.id, family.id, "proposed", bride);
    const [newest, next] = await recentNotices(app.db, ghotok.id, family.id);
    expect(newest).toMatchObject({ kind: "proposed", readAt: null });
    expect(next.readAt).not.toBeNull();
    await dismissNotice(app.db, ghotok.id, family.id, newest.id);
    expect(await unreadCount(app.db, ghotok.id, family.id)).toBe(0);
    expect((await recentNotices(app.db, ghotok.id, stranger.id)).every((n) => n.profileId !== bride)).toBe(true);
  });
});

describe("a family's interest and short list", () => {
  it("only point at listed biodata, and say whom it is for only with the family's own listed biodata of the other kind", async () => {
    expect(await code(expressInterest(app.db, ghotok.id, family.id, { profileId: pending }))).toBe("not_found");
    expect(await code(toggleFavorite(app.db, ghotok.id, family.id, pending))).toBe("not_found");
    expect(await code(expressInterest(app.db, stranger.id, family.id, { profileId: bride }))).toBe("not_found"); // another site's ghotok
    // a stranger cannot name the family's son, and nobody can name a groom for a groom
    expect(await code(expressInterest(app.db, ghotok.id, stranger.id, { profileId: bride, forProfileId: son }))).toBe("invalid_input");
    expect(await code(expressInterest(app.db, ghotok.id, family.id, { profileId: son, forProfileId: son }))).toBe("invalid_input");
  });

  it("lands in the ghotok's inbox once per family, can be taken back, and becomes a proposal the family hears about", async () => {
    await expressInterest(app.db, ghotok.id, stranger.id, { profileId: bride, note: "  " });
    await withdrawInterest(app.db, ghotok.id, stranger.id, bride);
    expect(await myInterestIn(app.db, ghotok.id, stranger.id, bride)).toBeNull();

    await expressInterest(app.db, ghotok.id, family.id, { profileId: bride, forProfileId: son, note: "প্রথম" });
    await expressInterest(app.db, ghotok.id, family.id, { profileId: bride, forProfileId: son, note: "সন্ধ্যায় ফোন করবেন" });
    expect(await newInterestCount(app.db, ghotok.id)).toBe(1);
    const [row] = await listInterests(app.db, ghotok.id);
    expect(row).toMatchObject({ note: "সন্ধ্যায় ফোন করবেন", profile: { id: bride }, forProfile: { id: son }, user: { name: "রহিমা বেগম", username: family.phone } });
    expect(await listInterests(app.db, family.id)).toHaveLength(0); // another "ghotok" sees nothing

    // what the family reads back about the bride carries no name
    const asked = await myInterests(app.db, ghotok.id, family.id);
    expect(asked.map((a) => a.b.id)).toEqual([bride]);
    expect(JSON.stringify(asked)).not.toContain("নুসরাত");

    expect(await code(proposeFromInterest(app.db, family.id, row.id))).toBe("not_found");
    const proposalId = await proposeFromInterest(app.db, ghotok.id, row.id);
    expect(await getProposal(app.db, ghotok.id, proposalId)).toMatchObject({ patroId: son, patriId: bride, note: "সন্ধ্যায় ফোন করবেন" });
    expect(await myInterestIn(app.db, ghotok.id, family.id, bride)).toMatchObject({ status: "proposed" });
    expect((await unreadNotices(app.db, ghotok.id, family.id))[0]).toMatchObject({ kind: "proposed", profileId: bride });
    // a proposed request is not taken back, nor woken by asking again
    await withdrawInterest(app.db, ghotok.id, family.id, bride);
    await expressInterest(app.db, ghotok.id, family.id, { profileId: bride });
    expect(await myInterestIn(app.db, ghotok.id, family.id, bride)).toMatchObject({ status: "proposed" });
  });

  it("can be closed and opened again; one without a 'for whom' cannot be proposed in one tap", async () => {
    await expressInterest(app.db, ghotok.id, stranger.id, { profileId: son });
    const [row] = await listInterests(app.db, ghotok.id);
    expect(await code(proposeFromInterest(app.db, ghotok.id, row.id))).toBe("invalid_input");
    await setInterestStatus(app.db, ghotok.id, row.id, "closed");
    expect((await listInterests(app.db, ghotok.id, "closed")).map((r) => r.id)).toEqual([row.id]);
    await setInterestStatus(app.db, ghotok.id, row.id, "new");
    expect(await newInterestCount(app.db, ghotok.id)).toBe(1);
  });

  it("keeps a private short list that toggles", async () => {
    expect(await toggleFavorite(app.db, ghotok.id, stranger.id, bride)).toBe(true);
    expect(await isFavorite(app.db, ghotok.id, stranger.id, bride)).toBe(true);
    expect(await isFavorite(app.db, ghotok.id, family.id, bride)).toBe(false);
    const list = await myFavorites(app.db, ghotok.id, stranger.id);
    expect(list.map((b) => b.id)).toEqual([bride]);
    expect(JSON.stringify(list)).not.toContain("নুসরাত");
    expect(await toggleFavorite(app.db, ghotok.id, stranger.id, bride)).toBe(false);
    expect(await myFavorites(app.db, ghotok.id, stranger.id)).toHaveLength(0);
  });
});

describe("matches for a family", () => {
  it("suggests listed people of the other kind for the family's own biodata, without names, skipping pairs already proposed", async () => {
    const another = await createProfile(app.db, ghotok.id, personForm({ kind: "patri", name: "তানিয়া", birthYear: "2000", district: "কুমিল্লা" }));
    const found = await matchesForFamily(app.db, ghotok.id, family.id);
    expect(found.map((m) => m.b.id)).toEqual([another]); // the bride is already proposed with the son
    expect(found[0].forId).toBe(son);
    expect(found[0].reasons.map((r) => r.key)).toContain("sameDistrict");
    expect(JSON.stringify(found)).not.toContain("তানিয়া");
    expect(await matchesForFamily(app.db, ghotok.id, stranger.id)).toEqual([]); // nothing of theirs is listed
  });
});

describe("follow-ups, dues and the monthly summary", () => {
  it("brings a live proposal back on its day, and not before", async () => {
    const [p] = await listInterests(app.db, ghotok.id, "proposed");
    const id = p.proposalId!;
    expect(await code(setFollowUp(app.db, ghotok.id, id, "kal"))).toBe("invalid_input");
    await setFollowUp(app.db, ghotok.id, id, "2099-01-01");
    expect(await dueFollowUps(app.db, ghotok.id)).toHaveLength(0);
    expect((await dueFollowUps(app.db, ghotok.id, "2099-01-02")).map((f) => f.id)).toEqual([id]);
    await setFollowUp(app.db, ghotok.id, id, today());
    expect((await dueFollowUps(app.db, ghotok.id))[0]).toMatchObject({ id, patri: { guardianPhone: "01822222222" } });
    await setFollowUp(app.db, ghotok.id, id, "");
    expect(await dueFollowUps(app.db, ghotok.id)).toHaveLength(0);
  });

  it("lists who still owes, and adds up each month with its weddings", async () => {
    const [p] = await listInterests(app.db, ghotok.id, "proposed");
    const id = p.proposalId!;
    const d = today();
    await addEntry(app.db, ghotok.id, { kind: "chukti", amount: "20000", entryDate: d, proposalId: id });
    await addEntry(app.db, ghotok.id, { kind: "joma", amount: "৫০০০", entryDate: d, proposalId: id });
    await addEntry(app.db, ghotok.id, { kind: "khoroch", amount: "300", entryDate: d, proposalId: "" });
    expect(await dues(app.db, ghotok.id)).toEqual([{ proposalId: id, baki: 15000, patro: { name: "রাকিব", guardianPhone: null }, patri: { name: "নুসরাত জাহান", guardianPhone: "01822222222" } }]);

    for (const to of ["dekha_shona", "thik_hoyeche", "biye_hoyeche"] as const) await changeStatus(app.db, ghotok.id, id, to, "");
    const months = await monthly(app.db, ghotok.id);
    expect(months).toHaveLength(6);
    expect(months.at(-1)).toEqual({ month: d.slice(0, 7), chukti: 20000, joma: 5000, khoroch: 300, weddings: 1 });
    expect(months[0]).toMatchObject({ chukti: 0, joma: 0, weddings: 0 });
    expect(await monthly(app.db, family.id)).toEqual(months.map((m) => ({ ...m, chukti: 0, joma: 0, khoroch: 0, weddings: 0 })));
  });
});

describe("passwords and sign-in", () => {
  const deps = () => ({ auth: app.auth, headers: new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }), db: app.db });

  it("lets the ghotok reset a family's password (never their own or the owner's), ending the old sessions", async () => {
    expect(await login(deps(), { phone: family.phone, password: family.password })).toMatchObject({ ok: true });
    const helper: AdminSession = { ...owner, id: stranger.id };
    expect(await code(resetPassword(app.db, owner, ghotok.id))).toBe("self_role");
    expect(await code(resetPassword(app.db, helper, ghotok.id))).toBe("owner_role");
    expect(await code(resetPassword(app.db, { ...owner, role: "customer" }, family.id))).toBe("forbidden");
    const fresh = await resetPassword(app.db, owner, family.id);
    expect(fresh).toMatch(/^[0-9]{8}$/);
    expect(await login(deps(), { phone: family.phone, password: family.password })).toEqual({ ok: false, code: "wrong_credentials" });
    expect(await login(deps(), { phone: family.phone, password: fresh })).toMatchObject({ ok: true });
    family.password = fresh;
  });

  it("lets anyone change their own password, knowing the current one", async () => {
    const signedIn = await app.auth.api.signInUsername({ body: { username: family.phone, password: family.password }, asResponse: true });
    const cookie = signedIn.headers.get("set-cookie")!.split(";")[0];
    const withSession = { auth: app.auth, headers: new Headers({ cookie }) };
    expect(await changePassword(withSession, { current: "not-it-at-all", next: "notun-password" })).toEqual({ ok: false, code: "wrong_credentials" });
    expect(await changePassword(withSession, { current: family.password, next: "short" })).toEqual({ ok: false, code: "weak_password" });
    expect(await changePassword(withSession, { current: family.password, next: "notun-password" })).toEqual({ ok: true });
    expect(await login(deps(), { phone: family.phone, password: "notun-password" })).toMatchObject({ ok: true });
  });

  it("stops a run of wrong passwords for a while, even with the right one, and a right one clears the count", async () => {
    for (let i = 0; i < PHONE_LIMIT - 1; i++) expect(await login(deps(), { phone: stranger.phone, password: "wrong-password" })).toMatchObject({ code: "wrong_credentials" });
    expect(await login(deps(), { phone: stranger.phone, password: stranger.password })).toMatchObject({ ok: true });
    for (let i = 0; i < PHONE_LIMIT; i++) await login(deps(), { phone: stranger.phone, password: "wrong-password" });
    expect(await login(deps(), { phone: stranger.phone, password: stranger.password })).toEqual({ ok: false, code: "too_many" });
    // after the window it works again
    expect(await isLockedOut(app.db, stranger.phone, null, new Date(Date.now() + 16 * 60_000))).toBe(false);
    // one address guessing many numbers is stopped too
    for (let i = 0; i < IP_LIMIT; i++) await recordFailure(app.db, `0190000${String(i).padStart(4, "0")}`, "198.51.100.7");
    expect(await isLockedOut(app.db, ghotok.phone, "198.51.100.7")).toBe(true);
    expect(await isLockedOut(app.db, ghotok.phone, "198.51.100.8")).toBe(false);
  });
});

describe("sign-up flooding", () => {
  it("allows an address a few accounts an hour, lets the hour pass, and does not eat login failures", async () => {
    const ip = "203.0.113.9";
    for (let i = 0; i < SIGNUP_LIMIT; i++) {
      expect(await signupLimited(app.db, ip)).toBe(false);
      await recordSignup(app.db, ip);
    }
    expect(await signupLimited(app.db, ip)).toBe(true);
    expect(await signupLimited(app.db, "203.0.113.10")).toBe(false);
    expect(await signupLimited(app.db, null)).toBe(false);
    expect(await signupLimited(app.db, ip, new Date(Date.now() + 61 * 60_000))).toBe(false);
    // a login failure written now survives a sign-up sweep, and sign-up rows survive a login sweep
    await recordFailure(app.db, "01900009999", "203.0.113.11");
    await recordSignup(app.db, "203.0.113.12");
    await recordFailure(app.db, "01900009998", "203.0.113.11", new Date(Date.now() + 20 * 60_000));
    expect(await signupLimited(app.db, ip)).toBe(true);
  });
});

describe("the activity log and the backup", () => {
  it("records who did what, scoped to the ghotok", async () => {
    await logActivity(app.db, ghotok.id, stranger.id, "listed", "রাকিব", `/profiles/${son}`);
    const rows = await listActivity(app.db, ghotok.id);
    expect(rows[0]).toMatchObject({ action: "listed", label: "রাকিব", actor: "অন্য পরিবার", actorId: stranger.id });
    expect(await listActivity(app.db, family.id)).toHaveLength(0);
  });

  it("exports only this ghotok's records, and a people sheet Excel can read", async () => {
    const elsewhere = await createProfile(app.db, family.id, personForm({ kind: "patri", name: "অন্য সাইটের", birthYear: "2000" }));
    const all = await exportAll(app.db, ghotok.id);
    expect(all.profiles.map((p) => p.id)).toEqual(expect.arrayContaining([son, bride, pending]));
    expect(all.profiles.map((p) => p.id)).not.toContain(elsewhere);
    expect(all.proposals).toHaveLength(1);
    expect(all.proposalEvents.length).toBeGreaterThan(1);
    expect(all.ledger).toHaveLength(3);
    expect(JSON.stringify(all)).not.toMatch(/password|scrypt/i);

    const csv = await peopleCsv(app.db, ghotok.id, (c) => c.toUpperCase());
    expect(csv.startsWith("﻿KIND,CODE,NAME,")).toBe(true);
    expect(csv).toContain("নুসরাত জাহান");
    expect(csv).not.toContain("অন্য সাইটের");
  });
});

describe("who looked at which biodata", () => {
  // fresh, still-listed biodata of its own: earlier tests have used up `son` and `bride` (proposals made)
  let mine: string; // the family's, listed
  let theirs: string; // the ghotok's, listed
  const eventsOn = async (profileId: string) => (await listProfileEvents(app.db, ghotok.id)).filter((e) => e.profileId === profileId);

  beforeAll(async () => {
    mine = await submitBiodata(app.db, ghotok.id, family.id, personForm({ kind: "patro", name: "সাকিব", birthYear: "1995", district: "কুমিল্লা" }));
    await setApproval(app.db, ghotok.id, mine, "approved");
    theirs = await createProfile(app.db, ghotok.id, personForm({ kind: "patri", name: "তাসনিম", birthYear: "2000", district: "কুমিল্লা" }));
    await setApproval(app.db, ghotok.id, theirs, "approved");
  });

  it("logs a family's views once per half hour, and skips its own, unlisted and other sites' biodata", async () => {
    await recordProfileEvent(app.db, ghotok.id, stranger.id, mine, "view");
    await recordProfileEvent(app.db, ghotok.id, stranger.id, mine, "view"); // the same look again: one row
    expect((await eventsOn(mine)).filter((e) => e.kind === "view" && e.userId === stranger.id)).toHaveLength(1);

    await recordProfileEvent(app.db, ghotok.id, family.id, mine, "view"); // the family's own biodata
    expect((await eventsOn(mine)).filter((e) => e.userId === family.id)).toHaveLength(0);
    await recordProfileEvent(app.db, ghotok.id, family.id, pending, "view"); // not approved
    expect(await eventsOn(pending)).toHaveLength(0);
    await recordProfileEvent(app.db, stranger.id, family.id, theirs, "view"); // another site's ghotok
    expect(await eventsOn(theirs)).toHaveLength(0);
  });

  it("logs short-list picks and requests, and the ghotok reads them with names", async () => {
    const before = await weekEventCounts(app.db, ghotok.id); // earlier tests wrote some too
    expect(await toggleFavorite(app.db, ghotok.id, stranger.id, mine)).toBe(true);
    await expressInterest(app.db, ghotok.id, stranger.id, { profileId: theirs });
    expect((await eventsOn(mine)).find((e) => e.kind === "favorite")).toMatchObject({ userId: stranger.id, who: "অন্য পরিবার", name: "সাকিব" });
    expect((await eventsOn(theirs)).find((e) => e.kind === "interest")).toMatchObject({ userId: stranger.id, name: "তাসনিম" });
    const after = await weekEventCounts(app.db, ghotok.id);
    expect(after).toEqual({ view: before.view, favorite: before.favorite + 1, interest: before.interest + 1 });
  });

  it("shows a family only numbers about its own biodata", async () => {
    const stats = await myBiodataStats(app.db, ghotok.id, family.id, mine);
    expect(stats).toEqual({ views: 1, viewsWeek: 1, families: 1, favorites: 1, interests: 0 });
    // someone else's biodata, or one of another site: zeros
    expect(await myBiodataStats(app.db, ghotok.id, stranger.id, mine)).toEqual({ views: 0, viewsWeek: 0, families: 0, favorites: 0, interests: 0 });
    expect(await myBiodataStats(app.db, stranger.id, family.id, mine)).toEqual({ views: 0, viewsWeek: 0, families: 0, favorites: 0, interests: 0 });
  });
});
