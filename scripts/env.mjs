// Runs a command with one of the site's environments:
//   node scripts/env.mjs test <command...>   values from .env.test (the test Supabase project)
//   node scripts/env.mjs live <command...>   values from .env.live (the real site), after typing "live" to confirm
// The file's values win over .env.local (Next and drizzle-kit never override what is already set), so .env.local keeps
// only what the local, embedded-database setup needs. Empty lines in the file are left unset.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const [name, ...command] = process.argv.slice(2);
if (!["test", "live"].includes(name) || !command.length) {
  console.error("ব্যবহার: node scripts/env.mjs <test|live> <command...>");
  process.exit(2);
}

/** KEY=VALUE lines; # comments and blank values are skipped; surrounding quotes are dropped. */
function read(file) {
  if (!existsSync(file)) return null;
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trimStart().startsWith("#")) continue;
    const value = m[2].replace(/^(["'])(.*)\1$/, "$2");
    if (value) out[m[1]] = value;
  }
  return out;
}

const file = `.env.${name}`;
const values = read(file);
if (!values) {
  console.error(`${file} নেই। .env.example দেখে বানান।`);
  process.exit(1);
}

if (name === "live") {
  // never the test database by mistake: the two files must point at different places
  const test = read(".env.test") ?? {};
  for (const key of ["DATABASE_URL", "DIRECT_URL", "SUPABASE_URL"]) {
    if (values[key] && values[key] === test[key]) {
      console.error(`.env.live আর .env.test এ ${key} একই। live এর জন্য আলাদা Supabase project দিন।`);
      process.exit(1);
    }
  }
  const host = (() => { try { return new URL(values.DIRECT_URL ?? values.DATABASE_URL).host; } catch { return "?"; } })();
  if (!process.stdin.isTTY) {
    console.error("live এ চালাতে terminal থেকে চালান, নিশ্চিত করতে হবে।");
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`আসল সাইটের database (${host}) এ চালাবেন? নিশ্চিত হলে live লিখুন: `);
  rl.close();
  if (answer.trim() !== "live") {
    console.log("বাতিল।");
    process.exit(1);
  }
}

// through the shell, so `next` and `drizzle-kit` resolve from node_modules/.bin (a .cmd on Windows); each argument
// quoted, so one with spaces stays one
const quote = (a) => (/^[A-Za-z0-9_./:=@-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`);
const child = spawn(command.map(quote).join(" "), { stdio: "inherit", shell: true, env: { ...process.env, ...values } });
child.on("exit", (code) => process.exit(code ?? 1));
