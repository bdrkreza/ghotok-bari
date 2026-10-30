import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

// One client per server instance; `globalThis` keeps it across hot reloads in development.
const g = globalThis as unknown as { altaDb?: Db; altaPg?: ReturnType<typeof postgres> };

/** Where the embedded development database lives (see scripts/dev-db.mjs, which migrates it before `next dev`). */
export const DEV_DB_DIR = "./.data/alta-dev";

/** True when no DATABASE_URL is set: the app runs on an embedded Postgres (PGlite) for local use only. */
export const usingDevDb = () => !process.env.DATABASE_URL;

/** Created on first use, so importing this file never needs a database (builds stay offline). */
export function getDb(): Db {
  if (g.altaDb) return g.altaDb;
  const url = process.env.DATABASE_URL;
  if (url) {
    // Supabase Shared Pooler runs in transaction mode, which does not support prepared statements.
    const max = Number(process.env.DATABASE_POOL_MAX ?? 5);
    g.altaPg ??= postgres(url, { prepare: false, max });
    g.altaDb = drizzlePostgres(g.altaPg, { schema });
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
    }
    console.warn(`[alta] DATABASE_URL নেই: ${DEV_DB_DIR} এ embedded Postgres (PGlite) ব্যবহার হচ্ছে। শুধু local কাজের জন্য।`);
    // PGlite creates only the last folder itself, so the parent has to exist first
    mkdirSync(dirname(DEV_DB_DIR), { recursive: true });
    g.altaDb = drizzlePglite(new PGlite(DEV_DB_DIR), { schema }) as unknown as Db;
  }
  return g.altaDb;
}

export { schema };
