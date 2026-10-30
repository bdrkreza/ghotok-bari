// Runs before `next dev`: with no DATABASE_URL, the app uses an embedded Postgres (PGlite) in ./.data/alta-dev,
// and this applies every migration in ./drizzle to it. With a DATABASE_URL it does nothing (use `npm run db:migrate`).
// It can also run beside a running `next dev`: the stamp file it touches makes the server reopen the database on the
// next request (lib/db/index.ts), so a new migration needs no restart.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

if (process.env.DATABASE_URL) {
  console.log("[alta] DATABASE_URL আছে, embedded dev database লাগছে না।");
  process.exit(0);
}

// ALTA_DEV_DB_DIR moves the database (see lib/db/index.ts); the default matches it
const dir = process.env.ALTA_DEV_DB_DIR || "./.data/alta-dev";
// PGlite creates only the last folder itself, so the parent has to exist first
mkdirSync(dirname(dir), { recursive: true });
const client = new PGlite(dir);
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
await client.close();
writeFileSync(`${dir}.migrated`, new Date().toISOString());
console.log(`[alta] embedded dev database ready: ${dir}`);
