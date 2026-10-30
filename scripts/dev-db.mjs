// Runs before `next dev`: with no DATABASE_URL, the app uses an embedded Postgres (PGlite) in ./.data/alta-dev,
// and this applies every migration in ./drizzle to it. With a DATABASE_URL it does nothing (use `npm run db:migrate`).
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

if (process.env.DATABASE_URL) {
  console.log("[alta] DATABASE_URL আছে, embedded dev database লাগছে না।");
  process.exit(0);
}

// PGlite creates only the last folder itself, so the parent has to exist first
mkdirSync("./.data", { recursive: true });
const client = new PGlite("./.data/alta-dev");
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
await client.close();
console.log("[alta] embedded dev database ready: ./.data/alta-dev");
