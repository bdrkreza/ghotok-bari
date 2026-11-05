# ঘটক বাড়ি (Ghotok Bari)

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
| `/me` | customer | The family's page: news from the ghotok (listed, returned, a request turned into a proposal) until dismissed, the biodata they handed in and where each stands (অপেক্ষমাণ / তালিকায় আছে / ফেরত দেওয়া, with the ghotok's note), "আপনার জন্য মিল" for their listed biodata, their short list and requests, the ghotok's contact |
| `/me/biodata/new`, `/me/biodata/[id]`, `/me/biodata/[id]/edit` | customer | Write a biodata (the ghotok's form without the private notes), see one's own in full with its approval state, change it (which sends it back for approval), take it back while unlisted |
| `/patro`, `/patri` | both | Biodata cards with a filter column: status (ghotok only), age, place, religion, marital status, education, profession, height, income (ghotok only). A family sees approved people still looking, by biodata number, no name or photo, and may search places but not names |
| `/biodata/[id]` | customer | One approved biodata as a family sees it: the same fields as the public link; "আগ্রহ জানান" (optionally saying for which of their own listed biodata, with a line), the short list, print / PDF, and the ghotok's call and WhatsApp buttons (the message starts with the biodata number) |
| `/dashboard` | admin | Greeting, a search bar into the lists, how many patro/patri are looking, a notice when biodata wait for approval, live proposals, money at a glance, recent people |
| `/dashboard/approvals` | admin | Biodata families handed in: waiting (অপেক্ষমাণ) and sent back (ফেরত দেওয়া), with who wrote each; opens the person's page |
| `/dashboard/customers` | admin | Every account: name, number, joined and last seen, role; make a helper an admin or take it back; reset a forgotten password (a new eight-digit one is shown once, to read out) |
| `/dashboard/interests` | admin | "আগ্রহ জানান" from families: who asked about which biodata and for whom; make the proposal in one tap, call, close or open again |
| `/dashboard/site` | admin | The front page's words: site name, tagline, the ghotok's paragraph, address, WhatsApp |
| `/dashboard/activity` | admin | Who on the ghotok's side changed what, newest first (the last 200) |
| `/dashboard/meetings` | admin | দেখা-দেখি: today's, tomorrow's and later meetings with the pair, time and place, then the last 30 days'; each opens its proposal |
| `/profiles/new?kind=patro` | admin | Add a person (name, age, looks, education, work, address, guardian, family, the "after marriage" answers, expectations); listed at once |
| `/profiles/[id]` | admin | One person: details, their proposals, suggested matches, status, public share link, delete. For a family's biodata: who handed it in, and the buttons to list it or return it with a note |
| `/b/[token]` | anyone with the link | Public biodata a ghotok chose to share: biodata number, the ghotok's check, age, height, complexion, weight, blood group, religion, marital status, education and medium, profession and workplace, village, upazila and district, where they live now, siblings and the family's means, religious practice, the "after marriage" answers, family, expectations, the parents' names only where the family agreed (the ghotok can switch it on the person's page), and the ghotok's number; never the name, photos, guardian phone, income or notes |
| `/proposals` | admin | Every proposal, filtered by stage |
| `/proposals/new` | admin | Pair one patro with one patri (listed people only) |
| `/proposals/[id]` | admin | Stage changes with a timeline, notes, a call-back day, দেখা-দেখি (when and where; both families are told), and the money for this match |
| `/hisab` | admin | Ledger: agreed fees (চুক্তি), payments received (জমা), own expenses (খরচ); the last six months month by month with weddings; who still owes, with call and WhatsApp reminder buttons |
| `/settings` | both | Account and role, change password, news on the phone (push), install on the phone, light or dark theme, sign out; for admins the front page, the activity log and the backup downloads |
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
`FAMILY_VIEW` in `lib/services/share.ts`, and is the same set of fields the public link shows. Handing in, a family
ticks that their guardian knows and the details are true (`pledgedAt`); once the ghotok approves, every family sees
"checked and listed by the ghotok" with the date (`approvedAt`) under the biodata number. Name, birth year and
district are required of everyone; a family must also give height, education and profession (what every card and search
shows), and the ghotok the guardian's number, except on a family's own biodata (`lib/profile-fields.ts`, checked in the
form and again on the server). Beyond that the form asks, all optional: complexion, weight and blood group; the medium of education and the workplace; where they live now;
brothers and sisters, the family's means and religious practice; the "after marriage" questions (a groom: may his wife
study or work, where they will live, any dowry; a bride: will she study or work, is a joint family fine); and the match
hoped for as an age range, least education, marital status and districts, which the ghotok's match suggestions use.

### Photos

Up to five photos per person, all optional, on the form's last step. Whatever their size, the browser turns each into
a JPEG of at most 100 KB before sending (`lib/shrink-image.ts`: 1280 pixels and good quality first, then lower
quality, then smaller, down to 480 pixels), so a slow connection copes and the free 1 GB holds about 2,000 people's five
photos. The first is the card picture
(`profile.photo_url` points at it, so every list shows it); any other can be moved first. Photos are private unless
the family ticks "অন্য পরিবারকে ছবি দেখাতে আপত্তি নেই" (or the ghotok switches it on the person's page, under "অন্য
পরিবার কী দেখবে"): `/api/photos/<id>` sends one to the ghotok's side, to the family who wrote that biodata, and to
other signed-in families only for a listed biodata whose photos are switched on; a 404 to everyone else. The shared
link never shows photos. The files live in a private Supabase Storage bucket
(`lib/storage.ts`, made on first use) when `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set; in development
without them, in `./.data/photos`; in production without them the picker is not shown. Deleting a biodata deletes its
files.

### Filling the form from a file

Families usually already have a biodata: a Word file, a PDF, or a photo of a printed sheet. "ফাইল থেকে ভরুন" on the
new-biodata form (a family's and the ghotok's) fills the fields from it; the person then checks and submits. Three
paths, chosen by which keys are set:

- **Free, in the browser** (no key): Word and PDF text is read exactly (`mammoth`, `pdf.js`); a photo, or a PDF that
  is only a scan, goes through OCR in the page (Tesseract.js, Bangla + English, loading its language data from its
  CDN on first use). The photo is cleaned first on a canvas: scaled up, turned grey, then black-and-white by an
  adaptive threshold so text on a coloured panel survives, and a two-column sheet is cut at its gutter and read
  column by column. Then `lib/biodata-import/parse.ts` maps labels and sections to fields by rules: "Name"/"নাম",
  "Date of Birth" to the year, 5'3" to centimetres, the permanent address split into village / upazila / district
  with the district's English spelling turned into Bangla, parents, siblings, "About me". Nothing leaves the phone.
- **Free AI, with `GEMINI_API_KEY`**: the file goes to Google's Gemini (`gemini-flash-lite-latest` by default:
  it answers in a couple of seconds, where the bigger Flash models think for a minute) through a server action,
  which returns the same fields as JSON; each field is checked against the schema and bad ones dropped. A key
  comes free from Google AI Studio without a card; the free tier's quota is a handful of requests a minute and a
  few hundred a day. When the quota is hit, the model takes over 45 seconds, or anything else fails, the browser
  falls back to the path above on its own.
- **Paid AI, with `ANTHROPIC_API_KEY`**: the file goes to Claude (`claude-opus-5-5` by default), the stronger
  reader for handwriting and prose; roughly 1-2 taka per biodata. Used instead of Gemini when both keys are set.
  `BIODATA_AI_MODEL` overrides either default. Either way the file is read and forgotten, never stored.

Fields that came from the file carry a "ফাইল থেকে" chip. Nothing is ever submitted automatically.

### Families' interest, short list and news

On any listed biodata a family can press **আগ্রহ জানান**: it lands in the ghotok's inbox (`/dashboard/interests`, a
banner on the dashboard) with the family's name and number, the line they wrote and, if they picked one, which of their
own listed biodata it is for. With that, the ghotok makes the proposal in one tap; without it, they call. Either way
the other family is told nothing. Once per family and biodata; it can be taken back until the ghotok acts. A family
also keeps a private short list (পছন্দের তালিকা). Both only ever point at approved biodata and read back through
`FAMILY_VIEW` (`lib/services/interests.ts`). When the ghotok lists or returns a family's biodata, or makes a proposal
from their request, the family finds a notice on `/me` until they dismiss it (`lib/services/notices.ts`). When a
biodata is newly listed, each family whose own listed biodata it suits well (`MATCH_NOTICE_MIN`, same religion, not
already proposed together) is told once ("আপনার জন্য নতুন মিল", `notifyNewMatch` in `lib/services/match.ts`). A bell in the top bar (phone and web, `app/(app)/_components/bell.tsx`) counts what is new and opens a
list: for a family, these notices, which can be marked read from there; for the ghotok, the biodata waiting for
approval, the families' interest, today's and tomorrow's দেখা-দেখি and the proposals due a call today, each opening
its screen. `/me` also suggests "যাঁদের সাথে মিলতে পারে" for the family's listed biodata, scored like the ghotok's
suggestions and shown without names (`matchesForFamily` in `lib/services/match.ts`).

### News on the phone

Settings has a "ফোনে খবর" card: one tap and the phone shows news even with the site closed (Web Push, free; an iPhone
needs ঘটক বাড়ি on the home screen first). A family is woken by every notice; the ghotok by a new biodata handed in and a
new "আগ্রহ জানান". No paid service and no library: `lib/push.ts` signs a VAPID token with node's crypto and sends the
push empty, so nothing needs encrypting; `public/sw.js` then asks `/api/push/latest` with the reader's own cookie and
shows the words in their language. Development makes its own keys (`./.data/vapid.json`); production takes
`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` from `npm run vapid`, and hides the card without them.

### The ghotok's day

A দেখা-দেখি is set on a live proposal's page (Dhaka date and time, place, a note): both families get a notice with
it, it shows on `/me`, on `/dashboard/meetings` and on the dashboard, and the bell reminds the ghotok the day before
and on the day (`lib/services/meetings.ts`). A live proposal can carry a call-back day; from that day the dashboard lists it with both guardians' numbers. The
ledger page shows the last six months (received as bars, everything in a table) and who still owes on each match, with
call and WhatsApp buttons that start a polite reminder. A family forgot their password: **পাসওয়ার্ড রিসেট** on the
accounts list makes a new one, ends their sessions and shows it once; anyone can change their own in settings.

### Keeping it safe

Five wrong passwords for one number, or twenty from one address, within 15 minutes stop sign-in for that number or
address until they age out; a right password clears the number's count (`lib/auth/throttle.ts`). Every change on the
ghotok's side is written to the activity log with who did it (`lib/services/activity.ts`, from the actions through
`lib/actions/audit.ts`). Settings offers two downloads (`/api/backup`, admins only): everyone on file as a CSV that
opens in Excel, and a full JSON backup of the site, people, photos' places, proposals with their timelines, the ledger
and the requests (no accounts or passwords). Any biodata page prints cleanly, or saves as a PDF from the print dialog:
bars, buttons and ornaments are left off, and a dark theme never reaches the paper.

## Two languages

Every screen is in Bangla by default and in English on request: the "বাং | EN" switch sits in the top bar, the
phone header, the sign-in panel, the front page and settings. The choice is a cookie (`lang`), kept for a year on
that browser. Digits, money, dates and the biodata number follow the language ("৳১২,০০০ · ৩০ অক্টোবর ২০২৬" or
"৳12,000 · 30 October 2026"), and so do the messages that come back from the server (form errors, notices). What
people typed, demo data included, stays as typed. All phrases live in `lib/i18n/dict.ts`, one key with two strings,
and a test keeps the two languages in step.

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

The look is mehedi: the brown-red of dried henna for buttons and links, deep henna for text and the sign-in panel, a
skin-cream ground, leaf green for good news and a true red for what is owed. Ornaments drawn from a hand's henna sit
faintly on the page (`public/henna/*.svg`, applied as CSS masks from `app/globals.css`): a seamless net over every
page, a vine-and-paisley in two corners of every page and in each home's hero card, a lattice band under every bar and
over the phone's tab bar, and a ring of dots around the "ঘ" mark. Colours follow the phone's light or dark setting. **সেটিংস → থিম** fixes one on that
device (kept in the browser, not on the server), and the sun/moon button in either bar flips it in one tap.

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
   `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). For photos, also `SUPABASE_URL` and
   `SUPABASE_SECRET_KEY` (`sb_secret_…`, Project Settings → API Keys; an older project's `SUPABASE_SERVICE_ROLE_KEY` works too); the free plan's 1 GB holds about 2,000 people's five
   photos, at no cost.
3. Migrate and run:

```bash
npm run db:migrate
npm run dev
```

4. Open the site: it shows `/setup` once. The ghotok (or you, on their behalf) fills in their name, number and
   password and the site's name; that account owns the site. Do this straight after deploying, before the address is
   shared. Should the ghotok ever lose access, put their new number in `ADMIN_PHONES` and have them register with it.

### Local, test and live

Three environments, one file each (all git-ignored):

| File | What | Used by |
|---|---|---|
| `.env.local` | this computer: the embedded database, photos on disk, demo data | `npm run dev` |
| `.env.test` | the test Supabase project | `npm run dev:test`, `npm run db:migrate:test` |
| `.env.live` | the real site's own Supabase project; the hosting's Production variables hold the same | `npm run db:migrate:live` |

`scripts/env.mjs` runs a command with `.env.test` or `.env.live` laid over `.env.local`. For live it asks you to type
`live` first, and refuses when a database or Supabase address is the same as the test one.

Deploying updates the database by itself: `npm run build` runs `scripts/migrate.mjs` before `next build`, which applies
any new migration to `DIRECT_URL` (and skips already applied ones; without `DIRECT_URL` it does nothing). If a
migration fails, the build stops and the site keeps running the previous version. On Vercel give Production the live
values and Preview the test ones, so a preview never touches the real database. `npm run db:migrate:live` does the
same by hand, from this computer.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build (applies new migrations to `DIRECT_URL` first) and server |
| `npm run typecheck` | Generate route types and run the TypeScript compiler |
| `npm run lint` | ESLint |
| `npm test` | Service and manifest tests on an in-process Postgres (PGlite) with the real migrations; no database needed |
| `npm run db:generate` | Write a new SQL migration from `lib/db/schema.ts` into `drizzle/` |
| `npm run db:migrate` | Apply migrations to `DIRECT_URL` (drizzle-kit, from `.env.local`) |
| `npm run db:migrate:test` / `db:migrate:live` | Apply migrations to the test or live database (`.env.test` / `.env.live`; live asks first) |
| `npm run backup:live` | Read-only dump of every table of the live database to `backups/ghotok-bari-<time>.json.gz` (newest 30 kept; `BACKUP_DIR`, `BACKUP_KEEP` change that). Never asks, so Task Scheduler can run it. The file holds family details and password hashes: keep it private (the repo is public). Photos are not in it |
| `npm run dev:test` | Development server on the test Supabase project instead of the embedded database |
| `npm run screenshots` | Capture every screen (phone and web) into `docs/screens/` using the installed Edge or Chrome (dev server must be running) |
| `npm run icons` | Redraw the home-screen icons in `public/` (only after changing the mark or brand colour) |
| `npm run vapid` | Print a key pair for push (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) to put in the production environment |

## Layout

```
app/            routes; (public) = the front page, (auth) = login, register and setup, offline = no-internet page
app/(app)/      behind sign-in: (ghotok) = the admin side, (customer) = /me and /biodata, patro + patri + settings = both roles
app/manifest.ts web app manifest for installing on a phone
components/     shared UI building blocks and client-side forms; biodata.tsx = a family's view
app/**/_components/  pieces used by one route only, next to it; (app)/_components/nav.tsx = tab bar + top bar per role
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

- SMS OTP at sign-in, once an SMS provider is chosen.
- Share a printable biodata (PDF) of one person with a family.
- Reminders: "call the patri's family on Friday".
- Rate-limit sign-in attempts per phone number.
- A store listing (Android/iOS shell around the same site) if ghotoks look for it in the Play Store.
