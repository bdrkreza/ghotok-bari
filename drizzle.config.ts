import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read .env.local on its own; load it the way Next does.
loadEnvConfig(process.cwd());

// Migrations use the direct connection, not the pooler.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DIRECT_URL ?? "" },
});
