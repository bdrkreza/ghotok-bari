@AGENTS.md

# Alta (আলতা)

Village matchmaker (ghotok) ledger. Read README.md for the screens, data model and setup.

## Rules

- UI text is Bangla, written directly in JSX. Numbers shown to the user go through `bn()` / `taka()` in `lib/bn.ts`.
- Every read and write lives in `lib/services/*`, takes `(db, ghotokId, ...)` and is scoped to that ghotok. Pages and
  actions never query tables directly. One exception: `publicBiodata(db, token)` in
  `lib/services/share.ts`, where the share token is the credential.
- Expected failures throw `AppError(code)` (`lib/errors.ts`); `attempt()` in `lib/form.ts` turns them into a Bangla
  message for the form. Raw error text never reaches the user.
- Server actions take `(prev: FormState, form: FormData)` and are used through `ActionForm` in `components/form.tsx`.
- Two layouts from one tree: phone (top bar, `max-w-md` column, bottom tab bar) and `lg:` web (top nav bar in
  `components/nav.tsx`, wider page, cards regrouped into columns). Keep the phone DOM order; let `lg:` classes only
  change placement. The manifest, `public/sw.js`, `/offline` and `/b/*` (shared biodata) are public in `proxy.ts`; keep them so.
- Schema changes: edit `lib/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`. With the embedded
  dev database, `node scripts/dev-db.mjs` applies it to a running `npm run dev` (the server reopens the database; no restart).
- With no `DATABASE_URL`, `getDb()` opens an embedded PGlite database in `./.data/alta-dev` (development only;
  `npm run dev` migrates it first). Demo data comes from `lib/demo.ts` via the button on the login page.
- `npm run screenshots` (dev server running) refreshes `docs/screens/` with phone (`NN-*.png`) and web (`web-NN-*.png`)
  captures; look at both after UI changes.
- Before finishing: `npm run typecheck && npm run lint && npm test`. Tests run on PGlite with the real migrations.
