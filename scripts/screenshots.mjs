// Takes screenshots of every screen, using the Edge or Chrome already on this computer: phone-sized, full-page
// captures of each screen, then laptop-width captures (web-*.png) of the screens whose layout changes.
// Run with the dev server up: npm run screenshots   (BASE_URL / OUT_DIR to change the target)
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { chromium } from "playwright-core";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.env.OUT_DIR ?? "docs/screens";
mkdirSync(out, { recursive: true });
// Drop the previous run's captures so renumbered screens leave no stale files behind.
for (const f of readdirSync(out)) if (/^(web-)?[0-9]{2}-.*[.]png$/.test(f)) rmSync(`${out}/${f}`);

const browser = await launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "bn-BD" });
const page = await context.newPage();
page.on("pageerror", (e) => console.error("page error:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.error("console:", m.text()); });

// Full-page captures: the tab bar sits at the end of the page instead of floating mid-capture,
// and the Next.js development indicator is hidden.
const CAPTURE_CSS = `
  nextjs-portal { display: none !important; }
  nav[aria-label="প্রধান"] { position: static !important; }
  main { padding-bottom: 1.25rem !important; }
`;
const settle = async () => {
  await page.waitForLoadState("networkidle");
  await page.addStyleTag({ content: CAPTURE_CSS });
};
const go = async (path) => {
  await page.goto(`${base}${path}`);
  await settle();
};

let n = 0;
const shot = async (name) => {
  const file = `${out}/${String(++n).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
};

// The web layout: laptop width, viewport-sized captures, since the top bar (or the brand panel on the sign-in
// screens) is meant to be seen beside the page.
const WIDE = { viewport: { width: 1280, height: 800 }, locale: "bn-BD" };
let w = 0;
const webShot = async (tab, path, name) => {
  await tab.goto(`${base}${path}`);
  await tab.waitForLoadState("networkidle");
  await tab.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  const file = `${out}/web-${String(++w).padStart(2, "0")}-${name}.png`;
  await tab.screenshot({ path: file });
  console.log(file);
};

await go("/login");
await shot("login");
await go("/register");
await shot("register");

// the same two screens at laptop width, in a tab with no cookies
const guest = await (await browser.newContext(WIDE)).newPage();
await webShot(guest, "/login", "login");
await webShot(guest, "/register", "register");
await guest.context().close();

// demo data + sign-in (development database only)
await go("/login");
const seed = page.getByRole("button", { name: /ডেমো ডেটা/ });
if (await seed.count()) {
  await seed.click();
  await page.waitForURL((u) => u.pathname === "/" || u.search.includes("demo=exists"), { timeout: 60_000 });
}
if (new URL(page.url()).pathname === "/login") {
  await page.fill("#phone", "01700000000");
  await page.fill("#password", "alta1234");
  await page.getByRole("button", { name: "লগইন করুন" }).click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 60_000 });
}
await settle();
await shot("home");

await go("/patro");
await shot("patro-list");

await page.getByRole("link", { name: /হাসান মাহমুদ/ }).click();
await page.waitForURL(/\/profiles\/[0-9a-f-]+$/);
await settle();
const hasanPath = new URL(page.url()).pathname;
await shot("profile-hasan");

// switch on the public biodata link for this person (a second run finds it already on) and keep the path for later
const makeLink = page.getByRole("button", { name: "শেয়ার লিংক তৈরি করুন" });
if (await makeLink.count()) await makeLink.click();
await page.getByLabel("শেয়ার লিংক").waitFor({ timeout: 30_000 });
const publicPath = new URL(await page.getByLabel("শেয়ার লিংক").inputValue()).pathname;

await go("/patri");
await page.getByRole("link", { name: /নাজমা বেগম/ }).click();
await page.waitForURL(/\/profiles\/[0-9a-f-]+$/);
await settle();
await shot("profile-nazma-suggestions");

await go("/proposals");
await shot("proposals");

await page.getByRole("link", { name: /হাসান মাহমুদ ও ফাতেমা আক্তার/ }).click();
await page.waitForURL(/\/proposals\/[0-9a-f-]+$/);
await settle();
const proposalPath = new URL(page.url()).pathname;
await shot("proposal-detail");

await go("/hisab");
await shot("hisab");

await go("/profiles/new?kind=patri");
await shot("new-patri-form");

await go("/proposals/new");
await shot("new-proposal");

await go("/settings");
await shot("settings");

await go("/offline");
await shot("offline");

// what a family sees from the shared link (public: the cookie jar makes no difference, and the web captures below still need it)
await go(publicPath);
await shot("public-biodata");

// The signed-in screens at laptop width, in a second tab that shares the sign-in cookies.
const web = await (await browser.newContext({ ...WIDE, storageState: await context.storageState() })).newPage();
await webShot(web, "/", "home");
await webShot(web, "/patro", "patro-list");
await webShot(web, hasanPath, "profile-hasan");
await webShot(web, proposalPath, "proposal-detail");
await webShot(web, "/hisab", "hisab");
await webShot(web, "/settings", "settings");

// the dashboard again with the computer set to dark
await web.emulateMedia({ colorScheme: "dark" });
await webShot(web, "/", "home-dark");
await web.emulateMedia({ colorScheme: "light" });
await webShot(web, publicPath, "public-biodata");

await browser.close();

async function launch() {
  for (const channel of ["msedge", "chrome"]) {
    try { return await chromium.launch({ channel, headless: true }); } catch { /* try the next one */ }
  }
  throw new Error("Neither Edge nor Chrome was found. Install one, or run: npx playwright install chromium");
}
