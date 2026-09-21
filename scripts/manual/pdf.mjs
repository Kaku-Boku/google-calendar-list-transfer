#!/usr/bin/env node
// 操作マニュアルの PDF を生成する。
//   node scripts/manual/pdf.mjs                # docs/manual/操作マニュアル.pdf
//   node scripts/manual/pdf.mjs --html-only    # 印刷用 HTML（.cache/manual/print.html）だけ作る
// 読む資料の経路（Shu to Sumi 第15章）: HTML ＋ document.css → Paged.js（表題欄・頁）→ Chrome ヘッドレス。
// document.css は manual:prepare が原稿から docs/manual/ に複製する。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MANUAL_DIR, PROJECT_DIR, fontsCssLinks, launchChrome, pagedJsUrl } from './lib.mjs';

const htmlOnly = process.argv.includes('--html-only');
const TMP = join(PROJECT_DIR, '.cache', 'manual');
mkdirSync(TMP, { recursive: true });

// 1. 印刷用 HTML: Google Fonts をローカルフォントに差し替え、Paged.js を読み込む
let html = readFileSync(join(MANUAL_DIR, 'index.html'), 'utf8');
html = html
  .replace(/<link rel="preconnect"[^>]*>\s*/g, '')
  .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, fontsCssLinks)
  .replace('<head>', `<head><base href="${pathToFileURL(MANUAL_DIR + '/').href}">`)
  .replace('</head>', `<script>window.PagedConfig = { after: () => { document.body.dataset.stsRendered = "ok"; } };</script>\n<script src="${pagedJsUrl}"></script>\n</head>`);
const printHtml = join(TMP, 'print.html');
writeFileSync(printHtml, html);
console.log('HTML:', printHtml);
if (htmlOnly) process.exit(0);

// 2. PDF（Paged.js の描画完了を待ってから印刷）
const outPdf = join(MANUAL_DIR, '操作マニュアル.pdf');
const browser = await launchChrome();
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.emulateMediaType('print');
  await page.goto(pathToFileURL(printHtml).href, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.stsRendered === 'ok', { timeout: 120000 })
    .catch(() => console.warn('Paged.js の完了を待てませんでした。そのまま印刷します。'));
  await page.evaluate(() => document.fonts.ready);
  const pages = await page.evaluate(() => document.querySelectorAll('.pagedjs_page').length);
  await page.pdf({ path: outPdf, preferCSSPageSize: true, printBackground: true });
  console.log('PDF :', outPdf, '(' + pages + ' pages)');
} finally { await browser.close(); }
