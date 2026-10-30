import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { getDb, type Db } from "../db";
import * as schema from "../db/schema";
import { MIN_PASSWORD_LENGTH, normalizePhone } from "./phone";

export interface AuthOptions {
  secret?: string;
  baseURL?: string;
  /** false in tests, which run outside a Next request and have no cookie jar */
  nextCookies?: boolean;
}

/**
 * Phone number + password, no SMS and no email. The phone number is the Better Auth "username".
 * Sessions live in our own Postgres, so signing out takes effect at once.
 */
export function createAuth(db: Db, opts: AuthOptions = {}) {
  return betterAuth({
    secret: opts.secret ?? process.env.BETTER_AUTH_SECRET,
    baseURL: opts.baseURL ?? process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    // stay signed in for half a year; each day of use pushes it on
    session: { expiresIn: 60 * 60 * 24 * 180, updateAge: 60 * 60 * 24 },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      // the email is a placeholder and is never used to sign in or to send mail
      requireEmailVerification: false,
    },
    plugins: [
      username({
        minUsernameLength: 11,
        maxUsernameLength: 11,
        usernameValidator: (value) => normalizePhone(value) === value,
      }),
      // must stay last: lets server actions set the session cookie
      ...(opts.nextCookies === false ? [] : [nextCookies()]),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let cached: { db: Db; auth: Auth } | undefined;

/** Built on first use, so importing this file needs neither a database nor secrets. Rebuilt when the database handle
 *  changes, which happens when the embedded dev database is reopened after a migration (lib/db/index.ts). */
export function getAuth(): Auth {
  const db = getDb();
  if (cached?.db !== db) cached = { db, auth: createAuth(db) };
  return cached.auth;
}
