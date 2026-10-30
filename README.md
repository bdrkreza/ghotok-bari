# আলতা (Alta)

A village ghotok's own website. One deployment is one matchmaker's site: families open an account with their
phone number, look at biodata and hand in their own; the ghotok runs everything from a dashboard: the people they
are finding matches for, every proposal and how far the talks have gone, and the money agreed, received and spent.

Everyone signs in with a phone number and password. There are two roles. A **customer** (any family that registers)
has their own page at `/me`, writes biodata there and browses `/patro` and `/patri` with names, photos and contacts
hidden. An **admin** sees the ghotok's side: dashboard, people, proposals, ledger, the biodata families handed in,
and the list of accounts. The ghotok becomes the site's owner and first admin on the one-time `/setup` screen, and
can make helpers admins from `/dashboard/customers`; the owner can never be demoted. `ADMIN_PHONES` in the environment
is a back door for the developer, not something the ghotok needs. One codebase serves both a **website** (a top-bar
layout on a computer) and a **phone app** (installed from the browser onto the home screen); see
[Web and mobile](#web-and-mobile).

## Screens

| Route | Who | What it does |
|---|---|---|
| `/setup` | first run | Shown while the site has no owner: the ghotok's name, number and password, plus the site's name, address and WhatsApp. Creates the account, the site and the dashboard in one go |
| `/` | anyone | The front page: the site's name and tagline, the ghotok's words, how many patro/patri are looking, how it works, call and WhatsApp buttons. Signed-in people are sent to their own screen |
| `/login`, `/register` | anyone | Sign in, or open a family's account (always a customer); on a computer the brand panel sits beside the form |
| `/me` | customer | The family's page: the biodata they handed in and where each stands (অপেক্ষমাণ / তালিকায় আছে / ফেরত দেওয়া, with the ghotok's note), how the site works, the ghotok's contact |
| `/me/biodata/new`, `/me/biodata/[id]`, `/me/biodata/[id]/edit` | customer | Write a biodata (the ghotok's form without the private notes), see one's own in full with its approval state, change it (which sends it back for approval), take it back while unlisted |
| `/patro`, `/patri` | both | Biodata cards with a filter column: status (ghotok only), age, place, religion, marital status, education, profession, height, income (ghotok only). A family sees approved people still looking, by biodata number, no name or photo, and may search places but not names |
| `/biodata/[id]` | customer | One approved biodata as a family sees it: the same fields as the public link, plus the ghotok's call and WhatsApp buttons to ask about that number |
| `/dashboard` | admin | Greeting, a search bar into the lists, how many patro/patri are looking, a notice when biodata wait for approval, live proposals, money at a glance, recent people |
| `/dashboard/approvals` | admin | Biodata families handed in: waiting (অপেক্ষমাণ) and sent back (ফেরত দেওয়া), with who wrote each; opens the person's page |
| `/dashboard/customers` | admin | Every account: name, number, joined and last seen, role; make a helper an admin or take it back |
| `/profiles/new?kind=patro` | admin | Add a person (name, age, education, address, guardian, family, expectations); listed at once |
| `/profiles/[id]` | admin | One person: details, their proposals, suggested matches, status, public share link, delete. For a family's biodata: who handed it in, and the buttons to list it or return it with a note |
| `/b/[token]` | anyone with the link | Public biodata a ghotok chose to share: biodata number, age, height, religion, marital status, education, profession, upazila and district, family, expectations, and the ghotok's number; no name, photo, parents, guardian phone, village, income or notes |
| `/proposals` | admin | Every proposal, filtered by stage |
| `/proposals/new` | admin | Pair one patro with one patri (listed people only) |
| `/proposals/[id]` | admin | Stage changes with a timeline, notes, and the money for this match |
| `/hisab` | admin | Ledger: agreed fees (চুক্তি), payments received (জমা), own expenses (খরচ) |
| `/settings` | both | Account and role, install on the phone, light or dark theme, sign out |
| `/offline` | anyone | What the installed app shows when there is no internet |

Proposal stages: প্রস্তাব দেওয়া → দেখাশোনা → কথা চলছে → বিয়ে ঠিক → বিয়ে হয়েছে, or বাদ at any point.
When a proposal reaches বিয়ে ঠিক both people become "engaged"; after বিয়ে হয়েছে both become "married".

Minimum ages are enforced when a person is added: patro 21, patri 18.

### How a family's biodata moves

A biodata a family writes is **pending** until the ghotok decides: it has a biodata number but is not in the
lists, not counted, not matched and cannot be proposed. **Approved**, it is a person like any the ghotok added, and
the ghotok's own notes field stays theirs. **Returned**, the family sees the ghotok's note on `/me` and can fix and
resubmit. Any change a family makes afterwards puts it back to pending. A family may delete a biodata only while it
is unlisted; a listed one is removed by the ghotok. What families see of each other is decided in one place,
`FAMILY_VIEW` in `lib/services/share.ts`, and is the same set of fields the public link shows.

### Filling the form from a file

Families usually already have a biodata: a Word file, a PDF, or a photo of a printed sheet. "ফাইল থেকে ভরুন" on the
new-biodata form (a family's and the ghotok's) fills the fields from it; the person then checks and submits. Two
paths, chosen by whether `ANTHROPIC_API_KEY` is set:

- **Free, in the browser** (no key): Word and PDF text is read exactly (`mammoth`, `pdf.js`); a photo, or a PDF that
  is only a scan, goes through OCR in the page (Tesseract.js, Bangla + English, loading its language data from its
  CDN on first use). Then `lib/biodata-import/parse.ts` maps labels and sections to fields by rules: "Name"/"নাম",
  "Date of Birth" to the year, 5'3" to centimetres, the permanent address split into village / upazila / district
  with the district's English spelling turned into Bangla, parents, siblings, "About me". Nothing leaves the phone.
- **With a key**: the file goes to Claude (`claude-opus-5-5` unless `BIODATA_AI_MODEL` says otherwise) through a
  server action, which returns the same fields in the same shape (structured output). Handwriting, unusual layouts
  and prose read far better; roughly 1-2 taka per biodata. The file is read and forgotten, never stored.

Fields that came from the file carry a "ফাইল থেকে" chip. Blood group, weight and complexion have no fields of their
own and land in পরিবারের বিবরণ as short lines. Nothing is ever submitted automatically.

### Coming next

"আগ্রহ জানান": a family marks interest in a biodata, the ghotok sees it in an inbox and turns it into a proposal;
the ghotok resets a family's forgotten password from the accounts list; the front page's words are edited from the
dashboard.

## Web and mobile

The same pages render two layouts, chosen by screen width (Tailwind's `lg` breakpoint, 1024px):

- **Phone and tablet**: one column, a slim top bar and a tab bar along the bottom with the role's everyday screens
  (dashboard, patro, patri, proposals and ledger for the ghotok; home, patro, patri and settings for a family). Open
  the site in Chrome on Android or Safari on iPhone and go to **সেটিংস → ফোনে app হিসেবে রাখুন**: Chrome shows an
  install button, Safari gets the "Add to Home Screen" steps. Installed, the site opens full-screen with its own icon
  and splash colour, long-pressing the icon offers নতুন পাত্র / নতুন পাত্রী / হিসাব shortcuts, and losing the
  connection shows a Bangla "ইন্টারনেট নেই" page instead of a browser error.
- **Computer**: a bar across the top with the site's name, the role's screens and the signed-in name (which opens
  settings); a wider page; and two columns where there is room (dashboard, person, proposal, ledger, front page).
  Forms stay one narrow column. Edge and Chrome offer to install it as a desktop app from the address bar too.

Colours follow the phone's light or dark setting. **সেটিংস → থিম** fixes one on that device (kept in the browser, not on
the server), and the sun/moon button in either bar flips it in one tap.

The phone layout's DOM order is kept on every screen; the wide layout only regroups cards into columns.

How the app side works: `app/manifest.ts` is the web app manifest (`/manifest.webmanifest`), the icons in `public/`
come from `npm run icons`, and `public/sw.js` is the service worker. The worker is registered only in production
builds (`components/pwa.tsx`); it caches hashed build assets and the offline page, and never caches anyone's
pages, which always come from the server. The proxy lets the front page, sign-in, setup, the manifest, the worker,
`/offline` and `/b/*` through without a session. Everything else needs a connection: there is no offline editing.

## Stack

Next.js 16 (App Router, Server Actions), TypeScript, Tailwind CSS 4, Drizzle ORM on PostgreSQL (Supabase),
Better Auth (phone + password), Zod. Bangla UI with self-hosted Hind Siliguri and Baloo Da 2 fonts. Installable as a
progressive web app (manifest, home-screen icons, offline page).

## Screenshots

Captures of every screen live in [docs/screens](docs/screens/) (`npm run screenshots` refreshes them against a
running dev server): phone-sized, full-page captures numbered `01-…`, and laptop-width captures named `web-…`.
`00-setup` is only captured on a fresh development database, where the setup screen still exists.

| Front page | Dashboard | Approvals | Family's page |
|---|---|---|---|
| ![Front page](docs/screens/01-front-page.png) | ![Dashboard](docs/screens/04-dashboard.png) | ![Approvals](docs/screens/13-approvals.png) | ![Family](docs/screens/19-customer-home.png) |

| Web: front page | Web: dashboard | Web: a family's list |
|---|---|---|
| ![Web front page](docs/screens/web-01-front-page.png) | ![Web dashboard](docs/screens/web-04-dashboard.png) | ![Web family list](docs/screens/web-16-customer-patri-list.png) |

## Quick start (no database to set up)

```bash
npm install
npm run dev
```

Without a `DATABASE_URL`, the app runs on an embedded Postgres (PGlite) stored in `./.data/alta-dev`; `npm run dev`
applies the migrations to it first. Open http://localhost:3000: it lands on `/setup`. Either fill the form in as the
ghotok, or press **ডেমো সাইট ও ডেটা তৈরি করে ঢুকুন** to get the demo site "করিম ঘটক ম্যারেজ মিডিয়া" with its ghotok
(`01700000000` / `alta1234`), sample people, proposals and ledger entries, and two family accounts (password
`alta1234`): `01700000002`, whose daughter's biodata is still waiting for the ghotok, and `01700000003`, whose son's
is already listed. The same button sits on the login page afterwards and only adds whatever is missing. Delete the
`.data` folder to start over. After adding a migration, `node scripts/dev-db.mjs` applies it while `npm run dev`
keeps running. `ALTA_DEV_DB_DIR` in `.env.local` moves the database to another folder: create it first with
`ALTA_DEV_DB_DIR=./.data/alta-fresh node scripts/dev-db.mjs`, then set the variable, and the running server switches
over. This mode is for local work only; production refuses to start without a database.

To try the installed-app behaviour locally, use a production build (`npm run build && npm start`): the service
worker is not registered by the dev server. Installing needs HTTPS, except on `localhost`.

## Production setup (Supabase)

1. Create a Supabase project. Copy the **Shared Pooler** (transaction mode) connection string and the **Direct**
   connection string from Project → Connect.
2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` (pooler), `DIRECT_URL` (direct) and
   `BETTER_AUTH_SECRET` (`openssl rand -base64 32`).
3. Migrate and run:

```bash
npm run db:migrate
npm run dev
```

4. Open the site: it shows `/setup` once. The ghotok (or you, on their behalf) fills in their name, number and
   password and the site's name; that account owns the site. Do this straight after deploying, before the address is
   shared. Should the ghotok ever lose access, put their new number in `ADMIN_PHONES` and have them register with it.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | Generate route types and run the TypeScript compiler |
| `npm run lint` | ESLint |
| `npm test` | Service and manifest tests on an in-process Postgres (PGlite) with the real migrations; no database needed |
| `npm run db:generate` | Write a new SQL migration from `lib/db/schema.ts` into `drizzle/` |
| `npm run db:migrate` | Apply migrations to `DIRECT_URL` |
| `npm run screenshots` | Capture every screen (phone and web) into `docs/screens/` using the installed Edge or Chrome (dev server must be running) |
| `npm run icons` | Redraw the home-screen icons in `public/` (only after changing the mark or brand colour) |

## Layout

```
app/            routes; (public) = the front page, (auth) = login, register and setup, offline = no-internet page
app/(app)/      behind sign-in: (ghotok) = the admin side, (customer) = /me and /biodata, patro + patri + settings = both roles
app/manifest.ts web app manifest for installing on a phone
components/     UI building blocks and client-side forms; nav.tsx = tab bar + top bar per role, biodata.tsx = a family's view
lib/db/         Drizzle connection and schema (site, profile, proposal, ledger; Better Auth's tables in auth-schema.ts)
lib/auth/       Better Auth setup, roles, session helpers (requireAdmin / requireCustomer), login and setup actions
lib/services/   all reads and writes, scoped to the site's ghotok (biodata.ts also to the family), throwing AppError
lib/actions/    server actions: validate the form, call a service, redirect or return a Bangla message
lib/bn.ts       Bangla numerals, money and status labels
public/         home-screen icons and sw.js (the service worker)
drizzle/        generated SQL migrations
scripts/        dev-db.mjs (migrate the embedded dev database), screenshots.mjs, icons.mjs
tests/          Vitest tests (tests/testdb.ts boots PGlite and applies drizzle/)
docs/screens/   screenshots of every screen
```

## Next steps

- Photo upload to Supabase Storage (today a photo is a pasted link).
- SMS OTP at sign-in, once an SMS provider is chosen.
- Share a printable biodata (PDF) of one person with a family.
- Reminders: "call the patri's family on Friday".
- Rate-limit sign-in attempts per phone number.
- A store listing (Android/iOS shell around the same site) if ghotoks look for it in the Play Store.
