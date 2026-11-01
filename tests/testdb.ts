import { eq } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createAuth } from "@/lib/auth";
import { register } from "@/lib/auth/service";
import type { Db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

/**
 * A real Postgres (PGlite, in-process) with every migration in ./drizzle applied.
 * Typed as the app's database so services can be called exactly as in production.
 */
export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return { db: db as unknown as Db, client };
}

/** Database plus an auth instance and a helper that signs accounts up through the real sign-up path. */
export async function createTestApp() {
  const { db, client } = await createTestDb();
  const auth = createAuth(db, { secret: "test-secret-test-secret-test-secret", baseURL: "http://localhost:3000", nextCookies: false });
  let n = 0;
  async function makeUser(name: string, password = "password-123") {
    const phone = `017${String(10_000_000 + n++).padStart(8, "0")}`;
    const result = await register({ auth, headers: new Headers() }, { name, phone, password });
    if (!result.ok) throw new Error(`sign-up failed: ${result.code}`);
    const [row] = await db.select().from(schema.user).where(eq(schema.user.username, phone));
    return { id: row.id, name, phone, password };
  }
  return { db, client, auth, makeUser };
}

/** A complete, valid form for a person; override what the test cares about. */
export function personForm(over: Record<string, string> = {}): Record<string, string> {
  return {
    kind: "patro",
    // the family's "my guardian knows, and this is true" box; the ghotok's own forms ignore it
    pledge: "on",
    name: "রহিম উদ্দিন",
    fatherName: "করিম উদ্দিন",
    motherName: "",
    birthYear: "1996",
    heightCm: "165",
    religion: "islam",
    maritalStatus: "obibahito",
    education: "এইচএসসি",
    profession: "কৃষি",
    monthlyIncome: "",
    village: "চরপাড়া",
    upazila: "সদর",
    district: "কুমিল্লা",
    guardianName: "",
    guardianPhone: "",
    familyDetails: "",
    expectations: "",
    notes: "",
    ...over,
  };
}
