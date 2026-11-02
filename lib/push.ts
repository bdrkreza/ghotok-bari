import { createPrivateKey, generateKeyPairSync, sign } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// Web Push without a library and without a paid service: every browser's own push service (Google's for Chrome,
// Mozilla's, Apple's) delivers for free. The push is sent empty, so nothing needs encrypting; the service worker
// wakes and fetches the words from /api/push/latest with the reader's own cookie. Only the VAPID signature is made
// here: an ES256 token saying which site sent it (RFC 8292).

export interface VapidKeys {
  /** the 65-byte uncompressed P-256 point, base64url: what the browser is given as applicationServerKey */
  publicKey: string;
  /** the 32-byte private scalar, base64url */
  privateKey: string;
}

/** A new pair, as `npm run vapid` prints it for VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY. */
export function newVapidKeys(): VapidKeys {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pub = publicKey.export({ format: "jwk" });
  const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x ?? "", "base64url"), Buffer.from(pub.y ?? "", "base64url")]);
  return { publicKey: raw.toString("base64url"), privateKey: privateKey.export({ format: "jwk" }).d ?? "" };
}

let cached: VapidKeys | null | undefined;

/**
 * The site's keys: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY from the environment. Development without them makes a
 * pair once and keeps it in ./.data/vapid.json, so push works out of the box; production without them has no push
 * (the settings card says so).
 */
export function vapidKeys(): VapidKeys | null {
  if (cached !== undefined) return cached;
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey } = process.env;
  if (publicKey && privateKey) return (cached = { publicKey, privateKey });
  if (process.env.NODE_ENV === "production") return (cached = null);
  const file = join(process.cwd(), ".data", "vapid.json");
  try {
    cached = JSON.parse(readFileSync(file, "utf8")) as VapidKeys;
  } catch {
    cached = newVapidKeys();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(cached));
  }
  return cached;
}

/** The Authorization header for one push service: a token for its origin, good for twelve hours. */
export function vapidAuthorization(endpoint: string, keys: VapidKeys, now = Date.now()): string {
  const raw = Buffer.from(keys.publicKey, "base64url");
  const key = createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: keys.privateKey, x: raw.subarray(1, 33).toString("base64url"), y: raw.subarray(33, 65).toString("base64url") },
    format: "jwk",
  });
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  // Apple refuses a token without a contact; VAPID_SUBJECT is the ghotok's or developer's mailto: or https: address
  const claims = { aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: process.env.VAPID_SUBJECT || "mailto:alta@example.com" };
  const body = `${part({ typ: "JWT", alg: "ES256" })}.${part(claims)}`;
  const signature = sign("sha256", Buffer.from(body), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `vapid t=${body}.${signature}, k=${keys.publicKey}`;
}

/**
 * Wakes one browser. "gone" when the push service says the subscription no longer exists (the caller forgets it);
 * "failed" for anything else, which is let go: the bell still shows the news.
 */
export async function sendEmptyPush(endpoint: string, keys: VapidKeys): Promise<"sent" | "gone" | "failed"> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: vapidAuthorization(endpoint, keys), TTL: String(24 * 3600), Urgency: "normal", "Content-Length": "0" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 404 || res.status === 410) return "gone";
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
