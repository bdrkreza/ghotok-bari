// Backs the real site's database up to a gzipped JSON file in ./backups, then keeps only the newest KEEP files.
//   npm run backup:live            reads DIRECT_URL (else DATABASE_URL) from .env.live; only ever SELECTs
//   BACKUP_DIR=D:\ghotok-bari-backups npm run backup:live   write somewhere else (a synced Google Drive folder, say)
// Meant for a scheduler (Windows Task Scheduler), so it never asks anything; exit code 1 on failure.
// The repo is public and the file holds every family's details and the password hashes: ./backups is git-ignored,
// keep the copy private. Photos live in Supabase Storage and are not part of this file (the table rows point at them).
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import postgres from "postgres";

const KEEP = Number(process.env.BACKUP_KEEP ?? 30);
const dir = process.env.BACKUP_DIR ?? "backups";

/** KEY=VALUE lines of .env.live; comments and blanks skipped, quotes dropped (same rules as scripts/env.mjs). */
function read(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trimStart().startsWith("#")) continue;
    const value = m[2].replace(/^(["'])(.*)\1$/, "$2");
    if (value) out[m[1]] = value;
  }
  return out;
}

if (!existsSync(".env.live")) {
  console.error("[backup] .env.live নেই।");
  process.exit(1);
}
const env = read(".env.live");
const url = env.DIRECT_URL ?? env.DATABASE_URL;
if (!url) {
  console.error("[backup] .env.live এ DIRECT_URL বা DATABASE_URL নেই।");
  process.exit(1);
}

const host = (() => { try { return new URL(url).host; } catch { return "?"; } })();
const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  console.log(`[backup] ${host} থেকে নিচ্ছি...`);
  // one read-only transaction, so every table is from the same moment
  const dump = await sql.begin("read only isolation level repeatable read", async (tx) => {
    const tables = await tx`
      select table_schema as schema, table_name as name from information_schema.tables
      where table_type = 'BASE TABLE' and table_schema in ('public', 'drizzle')
      order by table_schema, table_name`;
    const data = {};
    for (const { schema, name } of tables) {
      data[`${schema}.${name}`] = await tx.unsafe(`select * from "${schema}"."${name}"`);
    }
    return data;
  });

  const counts = Object.fromEntries(Object.entries(dump).map(([k, rows]) => [k, rows.length]));
  const file = JSON.stringify({ takenAt: new Date().toISOString(), host, counts, tables: dump });

  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const path = join(dir, `ghotok-bari-${stamp}.json.gz`);
  writeFileSync(path, gzipSync(file));
  console.log(`[backup] লেখা হয়েছে: ${path} (${Math.round(statSync(path).size / 1024)} KB)`);
  console.log(`[backup] ${Object.entries(counts).map(([k, n]) => `${k}=${n}`).join(", ")}`);

  const old = readdirSync(dir).filter((f) => /^(alta|ghotok-bari)-.*\.json\.gz$/.test(f)).sort().reverse().slice(KEEP);
  for (const f of old) unlinkSync(join(dir, f));
  if (old.length) console.log(`[backup] ${old.length}টা পুরনো ফাইল মুছে ফেলা হয়েছে (সর্বশেষ ${KEEP}টা রাখা)।`);
} catch (e) {
  console.error(`[backup] ব্যর্থ: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
