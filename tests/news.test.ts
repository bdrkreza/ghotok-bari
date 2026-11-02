import { createPublicKey, verify } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { pushSubscription } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { newVapidKeys, vapidAuthorization } from "@/lib/push";
import { submitBiodata } from "@/lib/services/biodata";
import { alerts } from "@/lib/services/dashboard";
import {
  addMeeting, dayFromToday, deleteMeeting, meetingsOf, myMeetings, parseDhakaTime, pastMeetings, soonMeetingCount, upcomingMeetings,
} from "@/lib/services/meetings";
import { recentNotices, unreadNotices } from "@/lib/services/notices";
import { setApproval } from "@/lib/services/profiles";
import { createProposal } from "@/lib/services/proposals";
import { hasPush, pushTo, pushToAdmins, removePushSubscription, savePushSubscription } from "@/lib/services/push";
import { createTestApp, personForm } from "./testdb";

// News that reaches people: দেখা-দেখি set on a proposal, a family told of a new match, and Web Push.

type App = Awaited<ReturnType<typeof createTestApp>>;

const code = async (p: Promise<unknown>) => {
  try { await p; return null; } catch (e) { return e instanceof AppError ? e.code : `other:${String(e)}`; }
};

let app: App;
let ghotok: { id: string };
let groomFamily: { id: string };
let brideFamily: { id: string };
let farFamily: { id: string };
let groom: string;
let bride: string;
let proposalId: string;

beforeAll(async () => {
  app = await createTestApp();
  ghotok = await app.makeUser("আব্দুল ঘটক");
  groomFamily = await app.makeUser("পাত্রের মা");
  brideFamily = await app.makeUser("পাত্রীর বাবা");
  farFamily = await app.makeUser("দূরের পরিবার");
  groom = await submitBiodata(app.db, ghotok.id, groomFamily.id, personForm({ kind: "patro", name: "রাকিব", birthYear: "1995", district: "কুমিল্লা", upazila: "লাকসাম" }));
  await setApproval(app.db, ghotok.id, groom, "approved");
  bride = await submitBiodata(app.db, ghotok.id, brideFamily.id, personForm({ kind: "patri", name: "নুসরাত", birthYear: "2000", district: "কুমিল্লা", upazila: "লাকসাম" }));
});

describe("a new match", () => {
  it("tells a family whose own listed biodata suits the newly listed one, once, and not the family who wrote it", async () => {
    // a groom far away and much older: listed, but not a good fit for the bride
    const far = await submitBiodata(app.db, ghotok.id, farFamily.id, personForm({ kind: "patro", name: "দূরের পাত্র", birthYear: "1975", district: "দিনাজপুর", maritalStatus: "talakprapto" }));
    await setApproval(app.db, ghotok.id, far, "approved");
    await setApproval(app.db, ghotok.id, bride, "approved");

    const kinds = async (userId: string) => (await recentNotices(app.db, ghotok.id, userId)).map((n) => n.kind);
    expect((await unreadNotices(app.db, ghotok.id, groomFamily.id)).find((n) => n.kind === "match")).toMatchObject({ profileId: bride, profileKind: "patri" });
    expect(await kinds(farFamily.id)).not.toContain("match");
    expect((await kinds(brideFamily.id)).filter((k) => k === "match")).toHaveLength(0);

    // listed again after an edit: no second notice
    await setApproval(app.db, ghotok.id, bride, "approved");
    expect((await kinds(groomFamily.id)).filter((k) => k === "match")).toHaveLength(1);
  });
});

describe("দেখা-দেখি", () => {
  it("reads the form's time as Dhaka time and refuses anything else", () => {
    expect(parseDhakaTime("2026-11-05T16:30")?.toISOString()).toBe("2026-11-05T10:30:00.000Z");
    expect(parseDhakaTime("2026-11-05")).toBeNull();
    expect(parseDhakaTime("কাল বিকেলে")).toBeNull();
  });

  it("is set on the ghotok's own proposal and tells both families, each about their own biodata", async () => {
    proposalId = await createProposal(app.db, ghotok.id, { patroId: groom, patriId: bride, note: "" });
    expect(await code(addMeeting(app.db, ghotok.id, proposalId, { at: "আজ" }))).toBe("invalid_input");
    expect(await code(addMeeting(app.db, groomFamily.id, proposalId, { at: "2099-01-01T10:00" }))).toBe("not_found");

    const at = new Date(Date.now() + 26 * 3600 * 1000);
    const local = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Dhaka", dateStyle: "short", timeStyle: "short" }).format(at).replace(" ", "T");
    await addMeeting(app.db, ghotok.id, proposalId, { at: local, place: "  পাত্রীর বাড়ি  ", note: "মামাও আসবেন" });

    const toGroom = (await unreadNotices(app.db, ghotok.id, groomFamily.id)).find((n) => n.kind === "meeting");
    const toBride = (await unreadNotices(app.db, ghotok.id, brideFamily.id)).find((n) => n.kind === "meeting");
    expect(toGroom).toMatchObject({ profileId: groom, note: "পাত্রীর বাড়ি" });
    expect(toBride).toMatchObject({ profileId: bride });
    expect(toGroom?.at?.toISOString().slice(0, 16)).toBe(parseDhakaTime(local)?.toISOString().slice(0, 16));
    expect(await myMeetings(app.db, ghotok.id, groomFamily.id)).toMatchObject([{ kind: "patro", place: "পাত্রীর বাড়ি" }]);
    expect(await myMeetings(app.db, ghotok.id, farFamily.id)).toHaveLength(0);
  });

  it("is listed as today, tomorrow or later, and counted for the bell for today and tomorrow only", async () => {
    const now = new Date("2026-11-03T12:00:00+06:00");
    const rows = await upcomingMeetings(app.db, ghotok.id, now);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].proposal).toMatchObject({ patro: { name: "রাকিব" }, patri: { name: "নুসরাত" } });
    expect(dayFromToday(new Date("2026-11-03T23:59:00+06:00"), now)).toBe(0);
    expect(dayFromToday(new Date("2026-11-04T00:00:00+06:00"), now)).toBe(1);
    expect(dayFromToday(new Date("2026-11-02T22:00:00+06:00"), now)).toBe(-1);

    // fixed moments, so the counts do not depend on when the test runs
    const later = new Date("2030-06-10T12:00:00+06:00");
    await addMeeting(app.db, ghotok.id, proposalId, { at: "2030-06-10T09:00" });
    await addMeeting(app.db, ghotok.id, proposalId, { at: "2030-06-11T20:00" });
    await addMeeting(app.db, ghotok.id, proposalId, { at: "2030-06-12T08:00" });
    await addMeeting(app.db, ghotok.id, proposalId, { at: "2030-06-01T08:00" });
    expect(await soonMeetingCount(app.db, ghotok.id, later)).toBe(2);
    expect((await pastMeetings(app.db, ghotok.id, later)).map((m) => m.at.toISOString())).toContain("2030-06-01T02:00:00.000Z");
    expect(await soonMeetingCount(app.db, groomFamily.id, later)).toBe(0);
  });

  it("is removed only by its own ghotok", async () => {
    const [first] = await meetingsOf(app.db, ghotok.id, proposalId);
    await deleteMeeting(app.db, groomFamily.id, first.id);
    expect((await meetingsOf(app.db, ghotok.id, proposalId))[0].id).toBe(first.id);
    await deleteMeeting(app.db, ghotok.id, first.id);
    expect((await meetingsOf(app.db, ghotok.id, proposalId)).map((m) => m.id)).not.toContain(first.id);
    expect(await alerts(app.db, ghotok.id)).toHaveProperty("meetings");
  });
});

describe("push", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("signs a VAPID token the push service can check with the site's public key", () => {
    const keys = newVapidKeys();
    expect(Buffer.from(keys.publicKey, "base64url")).toHaveLength(65);
    const header = vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc", keys, Date.UTC(2026, 10, 3));
    const [, token, k] = /^vapid t=([^,]+), k=(.+)$/.exec(header) ?? [];
    expect(k).toBe(keys.publicKey);
    const [h, c, s] = token.split(".");
    expect(JSON.parse(Buffer.from(c, "base64url").toString())).toMatchObject({ aud: "https://fcm.googleapis.com", exp: Date.UTC(2026, 10, 3) / 1000 + 12 * 3600 });
    const raw = Buffer.from(keys.publicKey, "base64url");
    const pub = createPublicKey({ key: { kty: "EC", crv: "P-256", x: raw.subarray(1, 33).toString("base64url"), y: raw.subarray(33).toString("base64url") }, format: "jwk" });
    expect(verify("sha256", Buffer.from(`${h}.${c}`), { key: pub, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"))).toBe(true);
  });

  it("wakes only the accounts it is for, forgets a browser the push service says is gone, and keeps one per browser", async () => {
    const sent: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      sent.push(url);
      return new Response(null, { status: url.includes("gone") ? 410 : 201 });
    }));
    await savePushSubscription(app.db, ghotok.id, groomFamily.id, "https://push.example/groom");
    await savePushSubscription(app.db, ghotok.id, brideFamily.id, "https://push.example/gone");
    await savePushSubscription(app.db, ghotok.id, ghotok.id, "https://push.example/ghotok");
    await savePushSubscription(app.db, ghotok.id, ghotok.id, "http://insecure.example/x");
    expect(await hasPush(app.db, ghotok.id, farFamily.id)).toBe(false);

    await pushTo(app.db, ghotok.id, [groomFamily.id, brideFamily.id]);
    expect(sent.sort()).toEqual(["https://push.example/gone", "https://push.example/groom"]);
    expect(await hasPush(app.db, ghotok.id, brideFamily.id)).toBe(false);

    sent.length = 0;
    await pushToAdmins(app.db, ghotok.id);
    expect(sent).toEqual(["https://push.example/ghotok"]);

    // the same browser signed in as another account moves to them
    await savePushSubscription(app.db, ghotok.id, farFamily.id, "https://push.example/groom");
    expect(await hasPush(app.db, ghotok.id, groomFamily.id)).toBe(false);
    await removePushSubscription(app.db, ghotok.id, groomFamily.id, "https://push.example/groom");
    expect(await app.db.select().from(pushSubscription).where(eq(pushSubscription.userId, farFamily.id))).toHaveLength(1);
  });

  it("never lets a failing push service break the action that sent it", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    await expect(pushTo(app.db, ghotok.id, [farFamily.id])).resolves.toBeUndefined();
    // handing in a biodata wakes the ghotok's phone; the push fails, the biodata is still saved
    await expect(submitBiodata(app.db, ghotok.id, farFamily.id, personForm({ kind: "patri", name: "অন্য পাত্রী", birthYear: "2001" }))).resolves.toBeTypeOf("string");
  });
});
