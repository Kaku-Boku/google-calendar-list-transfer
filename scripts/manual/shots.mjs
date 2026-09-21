#!/usr/bin/env node
// 操作マニュアルの画面写真を生成する。
//   node scripts/manual/shots.mjs            # docs/manual/img/*.png をすべて作り直す
//   node scripts/manual/shots.mjs 21 24      # 番号で絞る
// アプリの画面は src/ の実物（OAuth と Calendar API はモック）。Google の画面は mock/google.html の再現。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MANUAL_DIR, PROJECT_DIR, SAMPLE_CSV, buildMockApp, launchChrome } from './lib.mjs';

const IMG_DIR = join(MANUAL_DIR, 'img');
const TMP = join(PROJECT_DIR, '.cache', 'manual');
mkdirSync(IMG_DIR, { recursive: true });
mkdirSync(TMP, { recursive: true });
const only = process.argv.slice(2);
const annotate = readFileSync(new URL('./annotate.js', import.meta.url), 'utf8');

const appLogin = join(TMP, 'app-login.html');
const appMain = join(TMP, 'app-main.html');
writeFileSync(appLogin, buildMockApp({ loggedIn: false }));
writeFileSync(appMain, buildMockApp({ loggedIn: true }));
const googleMock = new URL('./mock/google.html', import.meta.url).href;

const WIDTH = 1200;
const browser = await launchChrome();

async function shoot(name, { url, width = WIDTH, setup, marks = [], clip, fullPage = true, height = 800 }) {
  if (only.length && !only.some((k) => name.startsWith(k))) return;
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.error(name, 'page error:', e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  if (setup) await setup(page);
  await new Promise((r) => setTimeout(r, 150));
  // 画面下に固定されるバーを自然な位置で写すため、ページ全体が収まる高さに窓を広げてから撮る
  if (fullPage) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewport({ width, height: h, deviceScaleFactor: 2 });
    await new Promise((r) => setTimeout(r, 100));
    fullPage = false;
  }
  if (marks.length) await page.evaluate(`(${annotate})(${JSON.stringify(marks)})`);
  await new Promise((r) => setTimeout(r, 50));
  const file = join(IMG_DIR, name + '.png');
  const opts = { path: file };
  // clip: sel の範囲を切り出す。fromTop なら画面上端から sel の下端まで（アプリバー込み）
  if (clip) opts.clip = await page.evaluate((sel, pad, height, fromTop, toBottom) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    const y = fromTop ? 0 : Math.max(0, r.top + window.scrollY - pad);
    const bottom = (toBottom ? document.querySelector(toBottom).getBoundingClientRect().bottom : r.bottom) + window.scrollY + pad;
    return { x: fromTop ? 0 : Math.max(0, r.left + window.scrollX - pad), y, width: fromTop ? document.documentElement.clientWidth : r.width + pad * 2, height: height || bottom - y };
  }, clip.sel, clip.pad ?? 16, clip.height, !!clip.fromTop, clip.toBottom || null);
  else opts.fullPage = fullPage;
  await page.screenshot(opts);
  await page.close();
  console.log('wrote', file);
}

const appReady = async (page) => { await page.waitForFunction(() => document.querySelector('#account-email').textContent.includes('@')); };
const click = (sel) => async (page) => { await page.click(sel); };
const loadCsv = async (page) => {
  await page.click('[data-tab="import"]');
  await page.evaluate((csv) => { document.querySelector('#import-text').value = csv; }, SAMPLE_CSV);
  await page.click('#import-parse-text');
  await page.evaluate(() => { document.querySelector('#import-file-name').textContent = 'calendar-list-2026-09-20.csv（7行）'; document.querySelector('#import-text').value = ''; });
};

// ---- 1. ログイン ----
await shoot('01-login', { url: pathToFileURL(appLogin).href, clip: { sel: '#panel-login', pad: 0, fromTop: true }, marks: [{ n: 1, sel: '#login-button' }] });
await shoot('02-chooser', { url: googleMock + '?screen=chooser', width: 800, clip: { sel: '.card[style]', pad: 12 }, marks: [{ n: 1, sel: '.account.pick' }] });
await shoot('03-warn', { url: googleMock + '?screen=warn', width: 800, clip: { sel: '.card[style]', pad: 12 }, marks: [{ n: 1, sel: '[data-screen="warn"] .detail-link', pad: 8 }] });
await shoot('04-warn-open', { url: googleMock + '?screen=warn-open', width: 800, clip: { sel: '.card[style]', pad: 12 }, marks: [{ n: 1, sel: '[data-screen="warn-open"] .detail-link', pad: 8 }, { n: 2, sel: '.go-link', pad: 8 }] });
await shoot('05-consent', { url: googleMock + '?screen=consent', width: 940, clip: { sel: '.card[style]', pad: 12 }, marks: [{ n: 1, sel: '.notice' }, { n: 2, sel: '.btn.continue' }] });

// ---- 2. 配布する人 ----
const panel = (sel) => ({ sel, pad: 24, fromTop: true });
const typeSelf = async (page, name, color) => {
  await page.evaluate((name, color) => {
    const n = document.querySelector('#self-name'); n.value = name; n.dispatchEvent(new Event('input', { bubbles: true }));
    if (color) { const c = document.querySelector('#self-color'); c.value = color; c.dispatchEvent(new Event('input', { bubbles: true })); c.dispatchEvent(new Event('blur')); }
  }, name, color);
};
// 01: 自分のカレンダーに名前を付ける（アプリバー〜01 の入力欄まで）
await shoot('10-export-self', {
  url: pathToFileURL(appMain).href,
  setup: async (page) => { await appReady(page); await typeSelf(page, '山田 太郎（営業）', '#4285f4'); },
  clip: { sel: '.self-form', pad: 24, fromTop: true },
  marks: [
    { n: 1, sel: '#account-menu summary' },
    { n: 2, sel: '[data-tab="export"]' },
    { n: 3, sel: '#self-name', at: 'bl' },
    { n: 4, sel: '.self-form .color-pair', at: 'bl' },
    { n: 5, sel: 'label.self-include', at: 'bl' },
  ],
});
// 02: 一覧（先頭に固定された自分の行〜アクションバー 03）
await shoot('11-export-list', {
  url: pathToFileURL(appMain).href,
  setup: async (page) => { await appReady(page); await typeSelf(page, '山田 太郎（営業）', '#4285f4'); },
  clip: { sel: '#panel-export .step:nth-of-type(2)', pad: 24, toBottom: '#panel-export' },
  marks: [
    { n: 1, sel: '#export-body tr.is-primary', pad: 0 },
    { n: 2, sel: '#export-body tr:nth-child(4) .col-check input', pad: 6 },
    { n: 3, sel: '#export-body tr:nth-child(4) .col-name input' },
    { n: 4, sel: '#export-body tr:nth-child(4) .color-cell', at: 'bl' },
    { n: 5, sel: '#export-download', at: 'tr' },
    { n: 6, sel: '#export-copy' },
  ],
});
await shoot('12-export-edit', {
  url: pathToFileURL(appMain).href,
  setup: async (page) => {
    await appReady(page); await typeSelf(page, '山田 太郎（営業）', '#4285f4');
    await page.evaluate(() => {
      const row = document.querySelector('#export-body tr:nth-child(4)');
      const name = row.querySelector('.col-name input');
      name.value = '【共用】会議室A（3F）'; name.dispatchEvent(new Event('input', { bubbles: true }));
      const cb = row.querySelector('.col-check input'); if (!cb.checked) cb.click();
      document.querySelector('#manual-id').value = 'c_soumu@group.calendar.google.com';
      document.querySelector('#manual-name').value = '総務からのお知らせ';
    });
  },
  clip: { sel: '#panel-export .step:nth-of-type(2)', pad: 24 },
  marks: [
    { n: 1, sel: '#export-search' },
    { n: 2, sel: 'label.chip:has(#export-include-owner)', union: 'label.chip:has(#export-include-hidden)' },
    { n: 3, sel: '#export-body tr:nth-child(4) .col-name input' },
    { n: 4, sel: '#export-body tr:nth-child(4) .color-cell', at: 'bl' },
    { n: 5, sel: '#export-bulk' },
    { n: 6, sel: '.manual-form' },
  ],
});
await shoot('14-export-done', {
  url: pathToFileURL(appMain).href,
  setup: async (page) => {
    await appReady(page); await typeSelf(page, '山田 太郎（営業）', '#4285f4');
    await page.evaluate(() => {
      // ダウンロードは撮影環境では動かないので、メッセージだけ出す
      const box = document.querySelector('#global-message');
      box.textContent = 'CSVをダウンロードしました。ダウンロードが始まらない場合は「表としてコピー」を使ってください。';
      box.className = 'message is-info'; box.hidden = false;
    });
  },
  clip: { sel: 'main', pad: 0, height: 560 }, height: 600,
  marks: [{ n: 1, sel: '#global-message' }],
});
// 名前が空のまま「CSVをダウンロード」を押したとき（困ったとき）
await shoot('15-export-self-error', {
  url: pathToFileURL(appMain).href,
  setup: async (page) => { await appReady(page); await page.click('#export-download'); },
  clip: { sel: '.self-form', pad: 24, fromTop: true },
  marks: [{ n: 1, sel: '#global-message' }, { n: 2, sel: '#self-name', union: '#self-name-error', frame: false, at: 'l', pad: 16 }],
});
await shoot('13-account-menu', {
  url: pathToFileURL(appMain).href,
  setup: async (page) => { await appReady(page); await page.evaluate(() => { document.querySelector('#account-menu').open = true; }); },
  clip: { sel: '.appbar', pad: 0, height: 300 }, height: 360, fullPage: false,
  marks: [{ n: 1, sel: '#account-menu summary' }, { n: 2, sel: '#reload-button' }, { n: 3, sel: '#switch-account' }, { n: 4, sel: '#logout-button' }],
});

// ---- 3. 受け取った人 ----
await shoot('20-import-empty', {
  url: pathToFileURL(appMain).href, clip: panel('#panel-import'),
  setup: async (page) => { await appReady(page); await page.click('[data-tab="import"]'); },
  marks: [{ n: 1, sel: '[data-tab="import"]' }, { n: 2, sel: '#import-dropzone' }, { n: 3, sel: '.paste-box' }],
});
await shoot('21-import-loaded', {
  url: pathToFileURL(appMain).href, clip: panel('#panel-import'),
  setup: async (page) => { await appReady(page); await loadCsv(page); },
  marks: [
    { n: 1, sel: '#import-source' },
    { n: 2, sel: '#import-summary' },
    { n: 3, sel: '#import-body tr:nth-child(4) .col-action' },
    { n: 4, sel: '#import-body tr:nth-child(1) .col-action' },
    { n: 5, sel: '#import-body tr:nth-child(3) .col-action' },
    { n: 6, sel: '#import-body tr:nth-child(6) .col-action', union: '#import-body tr:nth-child(7) .col-action' },
    { n: 7, sel: '#import-run' },
  ],
});
await shoot('22-import-confirm', {
  url: pathToFileURL(appMain).href,
  setup: async (page) => { await appReady(page); await loadCsv(page); await page.click('#import-run'); },
  clip: { sel: '#panel-import .action-bar', pad: 20 },
  marks: [{ n: 1, sel: '#import-confirm-text' }, { n: 2, sel: '#import-confirm-yes' }],
});
await shoot('23-import-running', {
  url: pathToFileURL(appMain).href, clip: panel('#panel-import'),
  setup: async (page) => {
    await appReady(page); await loadCsv(page);
    await page.evaluate(() => { window.__MOCK__.delay = 50; window.__MOCK__.holdAfter = 2; });
    await page.click('#import-run'); await page.click('#import-confirm-yes');
    await page.waitForFunction(() => document.querySelectorAll('#import-body .status-ok').length >= 2 && document.querySelectorAll('#import-body .status-running').length >= 1);
  },
  marks: [{ n: 1, sel: '#import-progress' }, { n: 2, sel: '#import-cancel' }, { n: 3, sel: '#import-body tr:nth-child(1) .col-result', union: '#import-body tr:nth-child(5) .col-result' }],
});
const runAll = async (page) => {
  await appReady(page); await loadCsv(page);
  await page.evaluate(() => { window.__MOCK__.delay = 20; });
  await page.click('#import-run'); await page.click('#import-confirm-yes');
  await page.waitForFunction(() => !document.querySelector('#result-modal').hidden);
};
await shoot('24-import-result', {
  url: pathToFileURL(appMain).href, setup: runAll, fullPage: false, height: 760, clip: { sel: '#result-modal .modal', pad: 28 },
  marks: [{ n: 1, sel: '#result-summary' }, { n: 2, sel: '#result-failed-table' }, { n: 3, sel: '#result-copy-failed' }, { n: 4, sel: '#result-close' }],
});
await shoot('25-import-after', {
  url: pathToFileURL(appMain).href,
  setup: async (page) => { await runAll(page); await page.click('#result-close'); },
  clip: { sel: '#panel-import .action-bar', pad: 20 },
  marks: [{ n: 1, sel: '#import-result-summary' }, { n: 2, sel: '#import-show-result' }, { n: 3, sel: '#import-retry' }],
});

// ---- 4. 困ったとき ----
await shoot('30-expired', {
  url: pathToFileURL(appLogin).href,
  setup: async (page) => { await page.evaluate(() => { const box = document.querySelector('#global-message'); box.textContent = 'ログインの有効期限が切れました。もう一度ログインしてください。'; box.className = 'message is-error'; box.hidden = false; }); },
  clip: { sel: 'main', pad: 0, height: 520 }, height: 700,
  marks: [{ n: 1, sel: '#global-message' }],
});

await browser.close();
