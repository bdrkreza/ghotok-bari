import { mkdirSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

// One client per server instance; `globalThis` keeps it across hot reloads in development.
const g = globalThis as unknown as { altaDb?: Db; altaPg?: ReturnType<typeof postgres>; altaDevKey?: string };

/**
 * Where the embedded development database lives (scripts/dev-db.mjs migrates it before `next dev`). ALTA_DEV_DB_DIR
 * moves it, e.g. to start over beside an old copy; read at call time because `next dev` reloads .env files on change.
 */
export const devDbDir = () => process.env.ALTA_DEV_DB_DIR || "./.data/alta-dev";
/** Touched by scripts/dev-db.mjs after it applies migrations; a newer stamp means the open handle predates them. */
export const devDbStamp = (dir: string) => `${dir}.migrated`;

/** True when no DATABASE_URL is set: the app runs on an embedded Postgres (PGlite) for local use only. */
export const usingDevDb = () => !process.env.DATABASE_URL;

/** Identifies the database a handle was opened on: its directory and the last time migrations were applied to it. */
const devKey = (dir: string) => {
  try {
    return `${dir}|${statSync(devDbStamp(dir)).mtimeMs}`;
  } catch {
    return `${dir}|0`;
  }
};

/** Created on first use, so importing this file never needs a database (builds stay offline). */
export function getDb(): Db {
  const url = process.env.DATABASE_URL;
  if (url) {
    if (g.altaDb) return g.altaDb;
    // Supabase Shared Pooler runs in transaction mode, which does not support prepared statements.
    const max = Number(process.env.DATABASE_POOL_MAX ?? 5);
    g.altaPg ??= postgres(url, { prepare: false, max });
    g.altaDb = drizzlePostgres(g.altaPg, { schema });
    return g.altaDb;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }
  // The embedded database keeps its schema in memory, so a migration that scripts/dev-db.mjs applied while the
  // server was running is only seen by a fresh handle; the stamp the script touches says when to open one.
  const dir = devDbDir();
  const key = devKey(dir);
  if (g.altaDb && g.altaDevKey === key) return g.altaDb;
  if (g.altaDb) {
    // The old handle is left to the garbage collector, not closed: closing writes a checkpoint into the very files
    // a new handle on the same directory is reading, and an idle PGlite never writes on its own.
    console.warn(`[alta] embedded database আবার খোলা হচ্ছে: ${dir}`);
  } else {
    console.warn(`[alta] DATABASE_URL নেই: ${dir} এ embedded Postgres (PGlite) ব্যবহার হচ্ছে। শুধু local কাজের জন্য।`);
  }
  // PGlite creates only the last folder itself, so the parent has to exist first
  mkdirSync(dirname(dir), { recursive: true });
  g.altaDb = drizzlePglite(new PGlite(dir), { schema }) as unknown as Db;
  g.altaDevKey = key;
  return g.altaDb;
}

export { schema };
