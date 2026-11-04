// Applies the SQL migrations in drizzle/ to the database at DIRECT_URL, then exits. Already applied ones are skipped
// (drizzle.__drizzle_migrations, the same table drizzle-kit uses), so it is safe to run on every deploy.
// Run by `npm run build` before `next build`: a deployment brings its database up to date by itself. Without
// DIRECT_URL (a local build, the embedded dev database) it does nothing.
//   npm run db:migrate:test / db:migrate:live   the same, against .env.test or .env.live (scripts/env.mjs)
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DIRECT_URL;
if (!url) {
  console.log("[migrate] DIRECT_URL নেই: migration বাদ (local build বা embedded database)।");
  process.exit(0);
}

// only the host is printed, never the password
const host = (() => { try { return new URL(url).host; } catch { return "?"; } })();
console.log(`[migrate] ${host} এ migration চলছে...`);
const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  console.log("[migrate] শেষ: database এখন কোডের সাথে মিলে আছে।");
} catch (e) {
  console.error(`[migrate] ব্যর্থ: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
