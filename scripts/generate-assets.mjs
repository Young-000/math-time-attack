/**
 * SVG를 PNG로 변환하는 스크립트
 * Playwright를 사용하여 SVG를 렌더링하고 스크린샷 캡처
 */

import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

async function svgToPng(svgPath, outputPath, width, height) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const svgContent = readFileSync(svgPath, 'utf-8');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; }
        body {
          width: ${width}px;
          height: ${height}px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        svg { width: ${width}px; height: ${height}px; }
      </style>
    </head>
    <body>${svgContent}</body>
    </html>
  `;

  await page.setViewportSize({ width, height });
  await page.setContent(html);
  await page.screenshot({ path: outputPath, type: 'png' });

  await browser.close();
  console.log(`✓ Generated: ${outputPath}`);
}

async function main() {
  console.log('🎨 Generating app assets...\n');

  // 아이콘 사이즈들
  const iconSizes = [
    { size: 512, name: 'app-icon-512.png' },
    { size: 192, name: 'app-icon-192.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 32, name: 'favicon-32.png' },
    { size: 16, name: 'favicon-16.png' },
  ];

  // 앱 아이콘 생성
  const iconSvg = join(publicDir, 'app-icon.svg');
  for (const { size, name } of iconSizes) {
    await svgToPng(iconSvg, join(publicDir, name), size, size);
  }

  // OG 이미지 생성
  const ogSvg = join(publicDir, 'og-image.svg');
  await svgToPng(ogSvg, join(publicDir, 'og-image.png'), 1200, 630);

  console.log('\n✅ All assets generated successfully!');
}

main().catch(console.error);
