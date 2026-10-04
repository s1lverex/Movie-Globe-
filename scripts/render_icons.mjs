// Renders public/favicon.svg to PNG app icons using the local Chromium.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const svg = readFileSync('public/favicon.svg', 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;background:#0B1220"><div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">${svg.replace('<svg ', `<svg width="${size * 0.82}" height="${size * 0.82}" `)}</div></body>`);
  await page.screenshot({ path: `public/icons/icon-${size}.png` });
  await page.close();
}
await browser.close();

// Open Graph preview image.
const og = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const p = await og.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(`<body style="margin:0;width:1200px;height:630px;background:radial-gradient(circle at 30% 50%,#1D3260,#0B1220 70%);display:flex;align-items:center;gap:56px;padding:0 110px;box-sizing:border-box;font-family:sans-serif">${svg.replace('<svg ', '<svg width="300" height="300" ')}<div><div style="color:#fff;font-size:88px;font-weight:800">Movie Globe</div><div style="color:#9CC2FF;font-size:40px;margin-top:8px">Walk the World. See the Movies.</div></div></body>`);
await p.screenshot({ path: 'public/og-image.png' });
await og.close();
