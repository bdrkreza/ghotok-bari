// Draws the home-screen icons into public/ with the Edge or Chrome already on this computer (like screenshots.mjs).
// Run: npm run icons   (only needed when the mark or the brand colour changes; the PNGs are committed)
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const font = readFileSync("node_modules/@fontsource/baloo-da-2/files/baloo-da-2-bengali-800-normal.woff2").toString("base64");

// radius 0 = the tile bleeds to the edge: Android crops a maskable icon to its own shape and iOS rounds the corners
// itself, so those two carry no transparency. "any" icons keep rounded, transparent corners.
const ICONS = [
  { file: "icon-192.png", size: 192, radius: 44, glyph: 112 },
  { file: "icon-512.png", size: 512, radius: 118, glyph: 300 },
  { file: "icon-maskable-512.png", size: 512, radius: 0, glyph: 250 }, // glyph inside the safe inner 80 %
  { file: "apple-icon.png", size: 180, radius: 0, glyph: 110 },
];

const html = ({ size, radius, glyph }) => `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Baloo; font-weight: 800; src: url(data:font/woff2;base64,${font}) format("woff2"); }
  html, body { margin: 0; background: transparent; }
  body { width: ${size}px; height: ${size}px; display: grid; place-items: center; }
  .tile { width: ${size}px; height: ${size}px; border-radius: ${radius}px; display: grid; place-items: center;
          background: linear-gradient(160deg, #c62a45 0%, #b3213a 55%, #93172e 100%); }
  .glyph { font: 800 ${glyph}px/1 Baloo; color: #fff; transform: translateY(${Math.round(glyph * 0.055)}px); }
</style></head><body><div class="tile"><span class="glyph">আ</span></div></body></html>`;

const browser = await launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const icon of ICONS) {
  await page.setViewportSize({ width: icon.size, height: icon.size });
  await page.setContent(html(icon));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/${icon.file}`, omitBackground: true });
  console.log(`public/${icon.file}`);
}
await browser.close();

async function launch() {
  for (const channel of ["msedge", "chrome"]) {
    try { return await chromium.launch({ channel, headless: true }); } catch { /* try the next one */ }
  }
  throw new Error("Neither Edge nor Chrome was found. Install one, or run: npx playwright install chromium");
}
