// Draws the site's mark (a house with a heart door, see components/logo.tsx) into the home-screen icons and the favicon with
// the Edge or Chrome already on this computer (like screenshots.mjs).
// Run: npm run icons   (only needed when the mark or the brand colour changes; the files are committed)
//   public/icon-192.png, icon-512.png, icon-maskable-512.png, apple-icon.png   home screen / install
//   app/favicon.ico (16, 32, 48 px), app/icon.svg                               browser tab
import { writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

// fixed brand colours (the light theme's tokens in app/globals.css)
const CRIMSON = "#b8102b", MAROON = "#8a0a1f", DEEP = "#650716", GOLD = "#e3b55a", IVORY = "#fff8ec";

/** The mark on a 100 x 100 tile; `inset` scales it down inside the tile (maskable icons keep to the inner 80 %). */
const mark = (inset = 0, id = "g") => {
  const s = 1 - inset * 2 / 100;
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="${CRIMSON}"/><stop offset="0.6" stop-color="${MAROON}"/><stop offset="1" stop-color="${DEEP}"/>
    </linearGradient></defs>
    <rect width="100" height="100" fill="url(#${id})"/>
    <g transform="translate(${inset} ${inset}) scale(${s})">
      <rect x="65" y="24" width="7" height="16" rx="1.5" fill="${GOLD}"/>
      <path d="M24 52 50 30 76 52V77Q76 81 72 81H28Q24 81 24 77Z" fill="${IVORY}"/>
      <path d="M17 54 50 26 83 54" fill="none" stroke="${GOLD}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M50 72C38 63 35 58 35 54C35 50 38 47.5 41.5 47.5C45 47.5 48 49.5 50 53C52 49.5 55 47.5 58.5 47.5C62 47.5 65 50 65 54C65 58 62 63 50 72Z" fill="${CRIMSON}"/>
    </g>`;
};

// radius 0 = the tile bleeds to the edge: Android crops a maskable icon to its own shape and iOS rounds the corners
// itself, so those two carry no transparency. "any" icons keep rounded, transparent corners.
const ICONS = [
  { file: "public/icon-192.png", size: 192, radius: 44, inset: 0 },
  { file: "public/icon-512.png", size: 512, radius: 118, inset: 0 },
  { file: "public/icon-maskable-512.png", size: 512, radius: 0, inset: 10 },
  { file: "public/apple-icon.png", size: 180, radius: 0, inset: 0 },
];
const FAVICONS = [16, 32, 48];

const html = ({ size, radius, inset }) => `<!doctype html><html><head><style>
  html, body { margin: 0; background: transparent; }
  svg { display: block; width: ${size}px; height: ${size}px; border-radius: ${radius}px; }
</style></head><body><svg viewBox="0 0 100 100">${mark(inset)}</svg></body></html>`;

const browser = await launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const shoot = async (spec) => {
  await page.setViewportSize({ width: spec.size, height: spec.size });
  await page.setContent(html(spec));
  return page.screenshot({ omitBackground: true });
};

for (const icon of ICONS) {
  writeFileSync(icon.file, await shoot(icon));
  console.log(icon.file);
}

// favicon.ico: PNG images inside an ICO container (every current browser reads them)
const pngs = [];
for (const size of FAVICONS) pngs.push({ size, data: await shoot({ size, radius: Math.round(size * 0.22), inset: 0 }) });
const head = Buffer.alloc(6 + 16 * pngs.length);
head.writeUInt16LE(1, 2); // type: icon
head.writeUInt16LE(pngs.length, 4);
let offset = head.length;
pngs.forEach(({ size, data }, i) => {
  const at = 6 + 16 * i;
  head.writeUInt8(size, at); head.writeUInt8(size, at + 1);
  head.writeUInt16LE(1, at + 4); head.writeUInt16LE(32, at + 6); // 1 plane, 32 bits
  head.writeUInt32LE(data.length, at + 8); head.writeUInt32LE(offset, at + 12);
  offset += data.length;
});
writeFileSync("app/favicon.ico", Buffer.concat([head, ...pngs.map((p) => p.data)]));
console.log("app/favicon.ico");

// the scalable tab icon (modern browsers prefer it over the .ico)
writeFileSync("app/icon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><clipPath id="r"><rect width="100" height="100" rx="22"/></clipPath><g clip-path="url(#r)">${mark(0, "g")}</g></svg>\n`);
console.log("app/icon.svg");
await browser.close();

async function launch() {
  for (const channel of ["msedge", "chrome"]) {
    try { return await chromium.launch({ channel, headless: true }); } catch { /* try the next one */ }
  }
  throw new Error("Neither Edge nor Chrome was found. Install one, or run: npx playwright install chromium");
}
