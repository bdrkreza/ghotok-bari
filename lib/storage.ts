// Where the photos' files live. With SUPABASE_URL and SUPABASE_SECRET_KEY: a private bucket in Supabase Storage
// (free up to 1 GB), talked to over its REST API with the service key, so nothing else is installed and the bucket
// is never public; the app hands files out through /api/photos/<id> after checking who is asking. Without them, in
// development only: a folder on disk (./.data/photos). In production without them photos are off.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export interface PhotoStore {
  put(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** the file, or null when it is not there */
  get(path: string): Promise<Uint8Array | null>;
  remove(paths: string[]): Promise<void>;
}

/** Paths are built by lib/services/photos.ts from ids; anything else is refused, so no path can climb out. */
const safe = (path: string) => {
  if (!/^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\.(jpg|png|webp)$/.test(path)) throw new Error(`bad photo path: ${path}`);
  return path;
};

function supabaseStore(url: string, key: string, bucket: string): PhotoStore {
  const base = url.replace(/\/+$/, "");
  const auth = { Authorization: `Bearer ${key}`, apikey: key };
  let bucketReady = false;
  /** the bucket is made private on first use, so setting up Supabase needs no clicking in its dashboard */
  const ensureBucket = async () => {
    if (bucketReady) return;
    const res = await fetch(`${base}/storage/v1/bucket`, {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id: bucket, name: bucket, public: false }),
    });
    // 200: made now; 400/409 "already exists": fine either way
    if (!res.ok && res.status !== 400 && res.status !== 409) throw new Error(`storage bucket: ${res.status}`);
    bucketReady = true;
  };
  return {
    async put(path, bytes, contentType) {
      await ensureBucket();
      const res = await fetch(`${base}/storage/v1/object/${bucket}/${safe(path)}`, {
        method: "POST", headers: { ...auth, "Content-Type": contentType, "x-upsert": "true" }, body: bytes as BodyInit,
      });
      if (!res.ok) throw new Error(`storage put: ${res.status}`);
    },
    async get(path) {
      const res = await fetch(`${base}/storage/v1/object/authenticated/${bucket}/${safe(path)}`, { headers: auth });
      if (res.status === 400 || res.status === 404) return null;
      if (!res.ok) throw new Error(`storage get: ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    },
    async remove(paths) {
      if (!paths.length) return;
      const res = await fetch(`${base}/storage/v1/object/${bucket}`, {
        method: "DELETE", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: paths.map(safe) }),
      });
      if (!res.ok && res.status !== 404) throw new Error(`storage remove: ${res.status}`);
    },
  };
}

/** A folder on disk, for development and tests. */
export function diskStore(dir: string): PhotoStore {
  const root = resolve(dir);
  const at = (path: string) => join(root, safe(path));
  return {
    async put(path, bytes) {
      await mkdir(dirname(at(path)), { recursive: true });
      await writeFile(at(path), bytes);
    },
    async get(path) {
      try { return new Uint8Array(await readFile(at(path))); } catch { return null; }
    },
    async remove(paths) {
      await Promise.all(paths.map((p) => rm(at(p), { force: true })));
    },
  };
}

let store: PhotoStore | null | undefined;

/** The photo store this deployment uses, or null when photos are off (production without Supabase Storage). */
export function getStore(): PhotoStore | null {
  if (store !== undefined) return store;
  const { SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET, ALTA_PHOTO_DIR } = process.env;
  // the secret key (sb_secret_…) as Supabase names it now, or the legacy service_role JWT; both pass as apikey and Bearer
  const key = SUPABASE_SECRET_KEY || SUPABASE_SERVICE_ROLE_KEY;
  if (SUPABASE_URL && key) store = supabaseStore(SUPABASE_URL, key, SUPABASE_BUCKET || "photos");
  else if (process.env.NODE_ENV !== "production") store = diskStore(ALTA_PHOTO_DIR || "./.data/photos");
  else store = null;
  return store;
}

/** Whether the forms offer photo upload. */
export const photosEnabled = () => getStore() !== null;
