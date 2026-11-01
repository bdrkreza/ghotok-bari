import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { profile } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { submitBiodata } from "@/lib/services/biodata";
import { MAX_PHOTO_BYTES, checkPhotos, deletePhotosOf, listPhotos, photoFor, savePhotos, type PhotoChange } from "@/lib/services/photos";
import { createProfile, getProfile, setApproval, setShowPhotos } from "@/lib/services/profiles";
import { publicBiodata, shareBiodata } from "@/lib/services/share";
import type { PhotoStore } from "@/lib/storage";
import { createTestApp, personForm } from "./testdb";

type App = Awaited<ReturnType<typeof createTestApp>>;

/** A photo store in memory, so the tests need neither Supabase nor the disk. */
function memoryStore() {
  const files = new Map<string, Uint8Array>();
  const store: PhotoStore = {
    async put(path, bytes) { files.set(path, bytes); },
    async get(path) { return files.get(path) ?? null; },
    async remove(paths) { for (const p of paths) files.delete(p); },
  };
  return { store, files };
}

/** A file whose first bytes say JPEG (or PNG); the content after them does not matter to the checks. */
const jpeg = (name = "a.jpg", size = 2000) => {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  return new File([bytes], name, { type: "image/jpeg" });
};
const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])], "b.png", { type: "image/png" });

const code = async (p: Promise<unknown>) => {
  try { await p; return null; } catch (e) { return e instanceof AppError ? e.code : `other:${String(e)}`; }
};
const change = (order: string[], files: File[] = []): PhotoChange => ({ order, files });

let app: App;
let ghotok: { id: string };
let family: { id: string };
let stranger: { id: string };

beforeAll(async () => {
  app = await createTestApp();
  ghotok = await app.makeUser("ছবির ঘটক");
  family = await app.makeUser("ছবির পরিবার");
  stranger = await app.makeUser("অন্য পরিবার");
});

describe("photos", () => {
  it("refuses more than five, anything that is not a picture, a huge file, and new photos where storage is off", async () => {
    const { store } = memoryStore();
    expect(await code(checkPhotos(change(["n:0", "n:1", "n:2", "n:3", "n:4", "n:5"], Array.from({ length: 6 }, () => jpeg())), store))).toBe("too_many_photos");
    const text = new File([new TextEncoder().encode("hello, not a picture")], "x.jpg", { type: "image/jpeg" });
    expect(await code(checkPhotos(change(["n:0"], [text]), store))).toBe("bad_photo");
    expect(await code(checkPhotos(change(["n:0"], [jpeg("big.jpg", MAX_PHOTO_BYTES + 1)]), store))).toBe("photo_too_big");
    expect(await code(checkPhotos(change(["n:0"], [jpeg()]), null))).toBe("photos_off");
    expect(await code(checkPhotos(change(["n:0", "n:1"], [jpeg(), png()]), store))).toBeNull();
  });

  it("saves, reorders and removes, and the first photo becomes the card picture", async () => {
    const { store, files } = memoryStore();
    const id = await createProfile(app.db, ghotok.id, personForm({ name: "ছবির পাত্র" }));
    await savePhotos(app.db, ghotok.id, id, change(["n:0", "n:1"], [jpeg(), png()]), store);
    const [first, second] = await listPhotos(app.db, ghotok.id, id);
    expect(files.size).toBe(2);
    expect((await getProfile(app.db, ghotok.id, id)).photoUrl).toBe(`/api/photos/${first.id}`);

    // the second first, a new one after it; leaving the first out removes it and its file
    await savePhotos(app.db, ghotok.id, id, change([`k:${second.id}`, "n:0"], [jpeg()]), store);
    const now = await listPhotos(app.db, ghotok.id, id);
    expect(now.map((p) => p.id)[0]).toBe(second.id);
    expect(now).toHaveLength(2);
    expect(files.size).toBe(2);
    expect((await getProfile(app.db, ghotok.id, id)).photoUrl).toBe(`/api/photos/${second.id}`);

    // all removed: no card picture; deleting the person clears the files
    await savePhotos(app.db, ghotok.id, id, change([]), store);
    expect(await listPhotos(app.db, ghotok.id, id)).toEqual([]);
    expect(files.size).toBe(0);
    expect((await getProfile(app.db, ghotok.id, id)).photoUrl).toBeNull();
  });

  it("keeps a photo link written before uploads existed until photos are added", async () => {
    const { store } = memoryStore();
    const id = await createProfile(app.db, ghotok.id, personForm({ name: "পুরনো লিংক" }));
    await app.db.update(profile).set({ photoUrl: "https://example.com/old.jpg" }).where(eq(profile.id, id));
    await savePhotos(app.db, ghotok.id, id, change([]), store);
    expect((await getProfile(app.db, ghotok.id, id)).photoUrl).toBe("https://example.com/old.jpg");
  });

  it("shows a photo to the ghotok's side and to the family who wrote it, to nobody else", async () => {
    const { store, files } = memoryStore();
    const id = await submitBiodata(app.db, ghotok.id, family.id, personForm({ kind: "patri", name: "ছবির পাত্রী", birthYear: "2002" }));
    await savePhotos(app.db, ghotok.id, id, change(["n:0"], [jpeg()]), store);
    const [photo] = await listPhotos(app.db, ghotok.id, id);
    const as = (userId: string, role: "admin" | "customer", g = ghotok.id) => photoFor(app.db, { userId, role, ghotokId: g }, photo.id, store);
    expect(await as(ghotok.id, "admin")).toMatchObject({ contentType: "image/jpeg" });
    expect(await as(family.id, "customer")).toMatchObject({ contentType: "image/jpeg" });
    expect(await as(stranger.id, "customer")).toBeNull();
    expect(await as(stranger.id, "admin", stranger.id)).toBeNull(); // another site's admin

    // the family agreed: other signed-in families see it, but only once the biodata is listed
    await setShowPhotos(app.db, ghotok.id, id, true);
    expect(await as(stranger.id, "customer")).toBeNull();
    await setApproval(app.db, ghotok.id, id, "approved");
    expect(await as(stranger.id, "customer")).toMatchObject({ contentType: "image/jpeg" });
    // a shared link never carries the picture, whatever was agreed
    const token = await shareBiodata(app.db, ghotok.id, id);
    expect(await publicBiodata(app.db, token)).toMatchObject({ showPhotos: true, photoUrl: null });
    await setShowPhotos(app.db, ghotok.id, id, false);
    expect(await as(stranger.id, "customer")).toBeNull();
    expect(await photoFor(app.db, { userId: ghotok.id, role: "admin", ghotokId: ghotok.id }, "not-an-id", store)).toBeNull();

    await deletePhotosOf(app.db, ghotok.id, id, store);
    expect(files.size).toBe(0);
  });

  it("is scoped to the ghotok", async () => {
    const { store } = memoryStore();
    const id = await createProfile(app.db, ghotok.id, personForm({ name: "অন্যের মানুষ" }));
    expect(await code(savePhotos(app.db, stranger.id, id, change(["n:0"], [jpeg()]), store))).toBe("not_found");
  });
});
