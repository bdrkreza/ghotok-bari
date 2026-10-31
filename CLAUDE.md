@AGENTS.md

# Alta (আলতা)

One village matchmaker's (ghotok's) website: families register to see biodata, the ghotok runs the dashboard.
Read README.md for the screens, roles, data model and setup.

## Rules

- The UI is bilingual, Bangla (default) and English, chosen by the `lang` cookie (the switch in every bar). Every
  phrase lives in `lib/i18n/dict.ts` under the same key in both languages (a test checks parity); nothing user-facing
  is hard-coded in JSX. Server components and actions get `t` from `getT()` in `lib/i18n/server.ts`, client components
  from `useT()` in `lib/i18n/client.tsx`. Numbers, money, dates, heights and the biodata number go through that same
  object (`t.n`, `t.money`, `t.date`, `t.height`, `t.biodataNo`) so digits follow the language. `lib/bn.ts` keeps the
  Bangla-only helpers for data (demo, tests), not for screens.
- Roles are `customer` and `admin` (`lib/db/auth-schema.ts`). The site's owner (`site.ghotok_id`) and `ADMIN_PHONES`
  are always admins (`lib/auth/roles.ts`). Pages and actions on the ghotok's side call `requireAdmin()` and pass its
  `ghotokId` (the owner's id, not the signed-in admin's) to services; the customer side calls `requireCustomer()`.
  Route groups `app/(app)/(ghotok)` and `app/(app)/(customer)` lock each side in their layout as well.
- Every read and write lives in `lib/services/*`, takes `(db, ghotokId, ...)` and is scoped to that ghotok. Pages and
  actions never query tables directly. Exceptions, each documented in its file: `publicBiodata(db, token)` in
  `lib/services/share.ts` (the share token is the credential); `getSite(db)` / `publicSite(db)` in
  `lib/services/site.ts` (the one site row says who the ghotok is); and `lib/services/customers.ts`, which reads the
  user table for admins, every function there calling `assertAdmin` first.
- A family's own biodata goes through `lib/services/biodata.ts`, scoped to `(db, ghotokId, ownerUserId, ...)`. What a
  family sees of anyone else is selected through `FAMILY_VIEW` in `lib/services/share.ts` and nothing more; only
  `approval = "approved"` rows are listed, counted, matched, proposed or shared (`profileWhere` defaults to that).
- "ফাইল থেকে ভরুন" (`components/biodata-import.tsx`) only pre-fills the form. Without an AI key everything runs in
  the browser (`lib/biodata-import/extract.ts` + the pure, tested `parse.ts`); with `GEMINI_API_KEY` (free) or
  `ANTHROPIC_API_KEY` (paid, wins when both are set), `lib/actions/import.ts` sends the file to the model
  (`lib/biodata-import/ai.ts`), and the browser falls back to its own path when that fails. Keep every path
  returning the same `Imported` fields.
- Expected failures throw `AppError(code)` (`lib/errors.ts`); `attempt()` in `lib/form.ts` turns them into a Bangla
  message for the form. Raw error text never reaches the user.
- Server actions take `(prev: FormState, form: FormData)` and are used through `ActionForm` in `components/form.tsx`.
- Colour comes only from the tokens in `app/globals.css` (light, then the two dark blocks, kept identical); the mehedi
  ornaments are the `.henna-*` classes there, CSS masks over `public/henna/*.svg`, so they recolour with the theme. New
  surfaces use the tokens, never a hex value in JSX.
- Two layouts from one tree: phone (top bar, `max-w-md` column, bottom tab bar) and `lg:` web (top nav bar in
  `components/nav.tsx`, wider page, cards regrouped into columns). Keep the phone DOM order; let `lg:` classes only
  change placement. `/`, `/setup`, the manifest, `public/sw.js`, `/offline` and `/b/*` (shared biodata) are public in
  `proxy.ts`; keep them so.
- Schema changes: edit `lib/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`. With the embedded
  dev database, `node scripts/dev-db.mjs` applies it to a running `npm run dev` (the server reopens the database; no restart).
- With no `DATABASE_URL`, `getDb()` opens an embedded PGlite database in `./.data/alta-dev` (development only;
  `npm run dev` migrates it first). Demo data comes from `lib/demo.ts` via the button on the setup and login pages.
- `npm run screenshots` (dev server running) refreshes `docs/screens/` with phone (`NN-*.png`) and web (`web-NN-*.png`)
  captures; look at both after UI changes.
- Before finishing: `npm run typecheck && npm run lint && npm test`. Tests run on PGlite with the real migrations.
