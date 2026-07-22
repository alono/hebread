#!/usr/bin/env node
// Visual niqqud check (PRD §11, phase 7): render every syllable in the shipping
// font and screenshot the grid so niqqud rendering can be eyeballed at a glance.
// Requires Playwright's chromium (npx playwright install chromium).
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'niqqud-check.png');

const fontPath = join(root, 'node_modules/@fontsource/noto-sans-hebrew/files/noto-sans-hebrew-hebrew-700-normal.woff2');
if (!existsSync(fontPath)) {
  console.error('Font not found — run npm install first.');
  process.exit(1);
}
const fontB64 = readFileSync(fontPath).toString('base64');

const levels = [];
for (let n = 1; n <= 6; n++) {
  const p = join(root, `src/content/syllables/level-${n}.json`);
  if (existsSync(p)) levels.push({ n, items: JSON.parse(readFileSync(p, 'utf8')) });
}

const section = (lvl) => `<section>
  <h2>שלב ${lvl.n} · ${lvl.items.length} הברות</h2>
  <div class="grid">${lvl.items
    .map((it) => `<div class="cell"><span class="g">${it.display}</span><span class="id">${it.id}</span></div>`)
    .join('')}</div>
</section>`;

const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>
  @font-face { font-family:'Noto Sans Hebrew'; font-weight:700; src:url('data:font/woff2;base64,${fontB64}') format('woff2'); }
  body { background:#eaf4ff; margin:0; padding:24px; font-family:system-ui,sans-serif; }
  h2 { color:#17324f; font-size:18px; margin:20px 0 10px; }
  .grid { display:grid; grid-template-columns:repeat(10,1fr); gap:8px; }
  .cell { background:#fff; border-radius:12px; padding:10px 4px; text-align:center; box-shadow:0 2px 6px rgba(23,50,79,.06); }
  .g { display:block; font-family:'Noto Sans Hebrew',sans-serif; font-weight:700; font-size:40px; line-height:2; color:#17324f; }
  .id { display:block; font-family:ui-monospace,monospace; font-size:9px; color:#7f95ad; direction:ltr; }
</style></head><body>${levels.map(section).join('')}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
const total = levels.reduce((s, l) => s + l.items.length, 0);
console.log(`niqqud-check.png written — ${total} syllables across ${levels.length} levels.`);
