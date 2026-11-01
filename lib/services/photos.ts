import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "../db";
import { profile, profilePhoto } from "../db/schema";
import { AppError } from "../errors";
import { getStore, type PhotoStore } from "../storage";

// A person's photos: up to five, optional, private like the name. The files are in the photo store (lib/storage.ts);
// the rows say which belong to whom and in what order. Every function is scoped to the ghotok.

export const MAX_PHOTOS = 5;
/** the browser shrinks each picture to at most 100 KB first (lib/shrink-image.ts); this only stops something odd */
export const MAX_PHOTO_BYTES = 1024 * 1024;

/** The picture the cards show: the first photo, served by the app. */
export const photoSrc = (id: string) => `/api/photos/${id}`;

const TYPES = [
  { type: "image/jpeg", ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  { type: "image/png", ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
  { type: "image/webp", ext: "webp", magic: [0x52, 0x49, 0x46, 0x46] },
];

/** What the file really is, read from its first bytes (the name and the browser's type can say anything). */
function sniff(bytes: Uint8Array) {
  return TYPES.find((t) => t.magic.every((b, i) => bytes[i] === b)
    && (t.type !== "image/webp" || String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"));
}

/**
 * What the form sends: the order of the pictures, each either one already saved ("k:<id>") or a new file
 * ("n:<index into files>"). Saved photos left out of the order are removed.
 */
export interface PhotoChange {
  order: string[];
  files: File[];
}

export const noPhotoChange = (): PhotoChange => ({ order: [], files: [] });

/** Read the form's photo fields: the files, and the order (`photoOrder`); absent when the form has no picker. */
export function photoChangeFrom(form: FormData): PhotoChange | null {
  if (!form.has("photoOrder") && !form.has("photos")) return null;
  const files = form.getAll("photos").filter((f): f is File => typeof f === "object" && f.size > 0);
  const order = form.getAll("photoOrder").map(String).filter(Boolean);
  return { order, files };
}

/** Refuse a change before anything is written: too many, not a picture, too big. */
export async function checkPhotos(change: PhotoChange, store: PhotoStore | null = getStore()): Promise<void> {
  if (change.order.length > MAX_PHOTOS) throw new AppError("too_many_photos");
  const newOnes = change.order.filter((o) => o.startsWith("n:"));
  if (newOnes.length && !store) throw new AppError("photos_off");
  for (const f of change.files) {
    if (f.size > MAX_PHOTO_BYTES) throw new AppError("photo_too_big");
    if (!sniff(new Uint8Array(await f.slice(0, 12).arrayBuffer()))) throw new AppError("bad_photo");
  }
}

/** The person's photos in order, ids only (the file comes through /api/photos/<id>). */
export async function listPhotos(db: Db, ghotokId: string, profileId: string): Promise<{ id: string }[]> {
  return db.select({ id: profilePhoto.id }).from(profilePhoto)
    .where(and(eq(profilePhoto.ghotokId, ghotokId), eq(profilePhoto.profileId, profileId)))
    .orderBy(asc(profilePhoto.position), asc(profilePhoto.createdAt));
}

/**
 * Apply the form's photos to a person the caller may already change (the ghotok's, or the family's own, checked
 * before this is called): upload the new files, drop the ones left out, store the order, and point the person's
 * picture (profile.photo_url) at the first, so every card shows it.
 */
export async function savePhotos(db: Db, ghotokId: string, profileId: string, change: PhotoChange, store: PhotoStore | null = getStore()): Promise<void> {
  await checkPhotos(change, store);
  const person = await db.query.profile.findFirst({ where: and(eq(profile.id, profileId), eq(profile.ghotokId, ghotokId)) });
  if (!person) throw new AppError("not_found");
  const current = await db.select().from(profilePhoto).where(and(eq(profilePhoto.ghotokId, ghotokId), eq(profilePhoto.profileId, profileId)));
  const known = new Map(current.map((p) => [p.id, p]));

  // the order as rows: kept ones by id, new ones uploaded now
  const ordered: string[] = [];
  const added: string[] = [];
  try {
    for (const item of change.order) {
      if (item.startsWith("k:")) {
        const id = item.slice(2);
        if (known.has(id) && !ordered.includes(id)) ordered.push(id);
      } else if (item.startsWith("n:")) {
        const file = change.files[Number(item.slice(2))];
        if (!file || !store) continue;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const kind = sniff(bytes)!;
        const id = crypto.randomUUID();
        const path = `${ghotokId}/${profileId}/${id}.${kind.ext}`;
        await store.put(path, bytes, kind.type);
        await db.insert(profilePhoto).values({ id, ghotokId, profileId, path, contentType: kind.type, position: ordered.length });
        added.push(id);
        ordered.push(id);
      }
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    console.error("photo upload failed", e);
    throw new AppError("photo_upload_failed");
  }

  const gone = current.filter((p) => !ordered.includes(p.id));
  if (gone.length) {
    await db.delete(profilePhoto).where(inArray(profilePhoto.id, gone.map((p) => p.id)));
    await store?.remove(gone.map((p) => p.path)).catch((e) => console.error("photo remove failed", e));
  }
  for (const [position, id] of ordered.entries()) {
    if (!added.includes(id) && known.get(id)?.position !== position) {
      await db.update(profilePhoto).set({ position }).where(eq(profilePhoto.id, id));
    }
  }
  // the cover; a link written before uploads existed stays until photos are added
  const cover = ordered[0] ? photoSrc(ordered[0]) : person.photoUrl?.startsWith("/api/photos/") ? null : person.photoUrl;
  if (cover !== person.photoUrl) await db.update(profile).set({ photoUrl: cover }).where(eq(profile.id, profileId));
}

/**
 * The photos of a person just added. The person is saved already, so if the photos fail the refusal points at them
 * (AppError.existing): the form then opens that biodata instead of offering to hand it in again.
 */
export async function savePhotosForNew(db: Db, ghotokId: string, profileId: string, change: PhotoChange, store: PhotoStore | null = getStore()): Promise<void> {
  try {
    await savePhotos(db, ghotokId, profileId, change, store);
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
    const [saved] = await db.select({ id: profile.id, kind: profile.kind, code: profile.code }).from(profile)
      .where(and(eq(profile.id, profileId), eq(profile.ghotokId, ghotokId))).limit(1);
    throw new AppError("photo_upload_failed", e.message, undefined, saved);
  }
}

/** Remove a person's photo files before the person is deleted (the rows go with the person). */
export async function deletePhotosOf(db: Db, ghotokId: string, profileId: string, store: PhotoStore | null = getStore()): Promise<void> {
  const rows = await db.select({ path: profilePhoto.path }).from(profilePhoto)
    .where(and(eq(profilePhoto.ghotokId, ghotokId), eq(profilePhoto.profileId, profileId)));
  if (rows.length) await store?.remove(rows.map((r) => r.path)).catch((e) => console.error("photo remove failed", e));
}

/** Who is asking for a photo: an admin of this site, or a family account. */
export interface PhotoViewer { userId: string; role: "admin" | "customer"; ghotokId: string }

/**
 * One photo's file for someone allowed to see it, or null: the ghotok's side sees every photo on the site; a family
 * sees only the photos of biodata they wrote. Other families never see photos.
 */
export async function photoFor(db: Db, viewer: PhotoViewer, photoId: string, store: PhotoStore | null = getStore()) {
  if (!/^[0-9a-f-]{36}$/.test(photoId) || !store) return null;
  const [row] = await db.select({ path: profilePhoto.path, contentType: profilePhoto.contentType, owner: profile.ownerUserId })
    .from(profilePhoto).innerJoin(profile, eq(profile.id, profilePhoto.profileId))
    .where(and(eq(profilePhoto.id, photoId), eq(profilePhoto.ghotokId, viewer.ghotokId))).limit(1);
  if (!row) return null;
  if (viewer.role !== "admin" && row.owner !== viewer.userId) return null;
  const bytes = await store.get(row.path);
  return bytes ? { bytes, contentType: row.contentType } : null;
}
