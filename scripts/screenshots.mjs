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
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "bn-BD" };
// The web layout: laptop width, viewport-sized captures, since the top bar (or the brand panel on the sign-in
// screens) is meant to be seen beside the page.
const WIDE = { viewport: { width: 1280, height: 800 }, locale: "bn-BD" };

// Full-page captures: the tab bar sits at the end of the page instead of floating mid-capture,
// and the Next.js development indicator is hidden.
const CAPTURE_CSS = `
  nextjs-portal { display: none !important; }
  nav[aria-label="প্রধান"] { position: static !important; }
  main { padding-bottom: 1.25rem !important; }
`;
const watch = (tab) => {
  tab.on("pageerror", (e) => console.error("page error:", e.message));
  tab.on("console", (m) => { if (m.type() === "error") console.error("console:", m.text()); });
  return tab;
};
const settle = async (tab) => {
  await tab.waitForLoadState("networkidle");
  await tab.addStyleTag({ content: CAPTURE_CSS });
};
const go = async (tab, path) => {
  await tab.goto(`${base}${path}`);
  await settle(tab);
};

let n = 0;
const shot = async (tab, name, number = String(++n).padStart(2, "0")) => {
  const file = `${out}/${number}-${name}.png`;
  await tab.screenshot({ path: file, fullPage: true });
  console.log(file);
};
let w = 0;
const webShot = async (tab, path, name, number = String(++w).padStart(2, "0")) => {
  await tab.goto(`${base}${path}`);
  await tab.waitForLoadState("networkidle");
  await tab.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  const file = `${out}/web-${number}-${name}.png`;
  await tab.screenshot({ path: file });
  console.log(file);
};
const signIn = async (tab, phone, password, landing) => {
  await tab.goto(`${base}/login`);
  await tab.fill("#phone", phone);
  await tab.fill("#password", password);
  await tab.getByRole("button", { name: "লগইন করুন" }).click();
  await tab.waitForURL((u) => u.pathname === landing, { timeout: 60_000 });
  await tab.waitForLoadState("networkidle");
};

// The ghotok's tab. On a fresh development database the site does not exist yet, so /login lands on /setup: that
// screen is captured (as 00, outside the numbering, since it is not there on later runs) and the demo button on it
// creates the site, the demo ghotok and their data. Later runs find the button on /login instead.
const page = watch(await (await browser.newContext(PHONE)).newPage());
await go(page, "/login");
if (new URL(page.url()).pathname === "/setup") {
  await shot(page, "setup", "00");
  const wide = await (await browser.newContext(WIDE)).newPage();
  await webShot(wide, "/setup", "setup", "00");
  await wide.context().close();
}
const seed = page.getByRole("button", { name: /ডেমো/ });
if (await seed.count()) {
  await seed.click();
  await page.waitForURL((u) => u.pathname === "/dashboard", { timeout: 90_000 });
} else {
  await signIn(page, "01700000000", "alta1234", "/dashboard");
}

// What anyone with the address sees before signing in: the front page and the two sign-in screens, phone and web.
const guest = watch(await (await browser.newContext(PHONE)).newPage());
await go(guest, "/");
await shot(guest, "front-page");
await go(guest, "/login");
await shot(guest, "login");
await go(guest, "/register");
await shot(guest, "register");
await guest.context().close();
const guestWeb = await (await browser.newContext(WIDE)).newPage();
await webShot(guestWeb, "/", "front-page");
await webShot(guestWeb, "/login", "login");
await webShot(guestWeb, "/register", "register");
await guestWeb.context().close();

// The ghotok's screens.
await go(page, "/dashboard");
await shot(page, "dashboard");

await go(page, "/patro");
await shot(page, "patro-list");

await page.getByRole("link", { name: /হাসান মাহমুদ/ }).click();
await page.waitForURL(/\/profiles\/[0-9a-f-]+$/);
await settle(page);
const hasanPath = new URL(page.url()).pathname;
await shot(page, "profile-hasan");

// switch on the public biodata link for this person (a second run finds it already on) and keep the path for later
const makeLink = page.getByRole("button", { name: "শেয়ার লিংক তৈরি করুন" });
if (await makeLink.count()) await makeLink.click();
await page.getByLabel("শেয়ার লিংক").waitFor({ timeout: 30_000 });
const publicPath = new URL(await page.getByLabel("শেয়ার লিংক").inputValue()).pathname;

await go(page, "/patri");
await page.getByRole("link", { name: /নাজমা বেগম/ }).click();
await page.waitForURL(/\/profiles\/[0-9a-f-]+$/);
await settle(page);
await shot(page, "profile-nazma-suggestions");

await go(page, "/proposals");
await shot(page, "proposals");

await page.getByRole("link", { name: /হাসান মাহমুদ ও ফাতেমা আক্তার/ }).click();
await page.waitForURL(/\/proposals\/[0-9a-f-]+$/);
await settle(page);
const proposalPath = new URL(page.url()).pathname;
await shot(page, "proposal-detail");

await go(page, "/hisab");
await shot(page, "hisab");

await go(page, "/profiles/new?kind=patri");
await shot(page, "new-patri-form");

await go(page, "/proposals/new");
await shot(page, "new-proposal");

await go(page, "/dashboard/customers");
await shot(page, "customers");

await go(page, "/settings");
await shot(page, "settings");

await go(page, "/offline");
await shot(page, "offline");

// what a family sees from the shared link (public: the cookie jar makes no difference, and the web captures below still need it)
await go(page, publicPath);
await shot(page, "public-biodata");

// The ghotok's screens at laptop width, in a second tab that shares the sign-in cookies.
const web = await (await browser.newContext({ ...WIDE, storageState: await page.context().storageState() })).newPage();
await webShot(web, "/dashboard", "dashboard");
await webShot(web, "/patro", "patro-list");
await webShot(web, hasanPath, "profile-hasan");
await webShot(web, proposalPath, "proposal-detail");
await webShot(web, "/hisab", "hisab");
await webShot(web, "/dashboard/customers", "customers");
await webShot(web, "/settings", "settings");

// the dashboard again with the computer set to dark
await web.emulateMedia({ colorScheme: "dark" });
await webShot(web, "/dashboard", "dashboard-dark");
await web.emulateMedia({ colorScheme: "light" });
await webShot(web, publicPath, "public-biodata");

// A family's own page: a separate sign-in as a demo customer, phone and web.
const customer = watch(await (await browser.newContext(PHONE)).newPage());
await signIn(customer, "01700000002", "alta1234", "/me");
await customer.addStyleTag({ content: CAPTURE_CSS });
await shot(customer, "customer-home");
const customerWeb = await (await browser.newContext(WIDE)).newPage();
await signIn(customerWeb, "01700000002", "alta1234", "/me");
await webShot(customerWeb, "/me", "customer-home");

await browser.close();

async function launch() {
  for (const channel of ["msedge", "chrome"]) {
    try { return await chromium.launch({ channel, headless: true }); } catch { /* try the next one */ }
  }
  throw new Error("Neither Edge nor Chrome was found. Install one, or run: npx playwright install chromium");
}
