// 操作マニュアル生成の共通部品。
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

export const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MANUAL_DIR = join(PROJECT_DIR, 'docs', 'manual');
export const SRC_DIR = join(PROJECT_DIR, 'src');

export const CHROME = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) { console.error('Google Chrome が見つかりません。CHROME_PATH で指定してください。'); process.exit(1); }

export const fontsCssLinks = [
  '@fontsource/biz-udpgothic/400.css', '@fontsource/biz-udpgothic/700.css',
  '@fontsource/barlow-condensed/700.css', '@fontsource/ibm-plex-mono/400.css'
].map((name) => `<link rel="stylesheet" href="${pathToFileURL(join(PROJECT_DIR, 'node_modules', name)).href}">`).join('\n');
export const pagedJsUrl = pathToFileURL(join(PROJECT_DIR, 'node_modules', 'pagedjs', 'dist', 'paged.polyfill.js')).href;

export async function launchChrome() {
  return puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--hide-scrollbars'] });
}

/**
 * GAS のスクリプトレットを展開し、OAuth と Calendar API をモックした index.html を組み立てる。
 * 実際の styles.html / app.html をそのまま使うので、見た目と動きは本物と同じ。
 * @param {{ loggedIn: boolean, message?: string }} opts
 */
export function buildMockApp(opts) {
  let html = readFileSync(join(SRC_DIR, 'index.html'), 'utf8');
  html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
  // Google Fonts の代わりにプロジェクトのローカルフォントを使う。
  html = html.replace(/<link rel="preconnect"[^>]*>\s*/g, '').replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, fontsCssLinks);
  html = html.replace("<?!= includeFile('styles') ?>", readFileSync(join(SRC_DIR, 'styles.html'), 'utf8'));
  html = html.replace('<?!= JSON.stringify(clientId) ?>', '"mock-client"').replace('<?!= JSON.stringify(appUrl) ?>', '"https://script.google.com/macros/s/mock/exec"');
  const mock = `<script>
(function(){
  try { localStorage.clear(); localStorage.setItem('calendar-bulk-registration.oauth-state', 'manual-mock-state'); } catch (e) {}
  var LOGGED_IN = ${JSON.stringify(!!opts.loggedIn)};
  // 説明用のサンプル。名前・メールアドレスはすべて架空
  var cals = [
    {id:'yamada.taro@example.com', summary:'yamada.taro@example.com', primary:true, accessRole:'owner', backgroundColor:'#4285f4', selected:true},
    {id:'c_sales@group.calendar.google.com', summary:'営業チーム', accessRole:'owner', backgroundColor:'#0b8043', selected:true},
    {id:'c_room_a@group.calendar.google.com', summary:'会議室A', accessRole:'writer', backgroundColor:'#8e24aa', selected:true},
    {id:'c_hiring@group.calendar.google.com', summary:'採用面接', accessRole:'reader', backgroundColor:'#039be5', selected:true},
    {id:'c_deadline@group.calendar.google.com', summary:'締切・提出物', accessRole:'owner', backgroundColor:'#d50000', selected:true},
    {id:'c_allhands@group.calendar.google.com', summary:'全社イベント', accessRole:'reader', backgroundColor:'#f6bf26', selected:true},
    {id:'c_old@group.calendar.google.com', summary:'旧・プロジェクトX', accessRole:'reader', backgroundColor:'#616161', hidden:true, selected:false},
    {id:'ja.japanese#holiday@group.v.calendar.google.com', summary:'日本の祝日', accessRole:'reader', backgroundColor:'#0b8043', selected:true}
  ];
  var byId = {}; cals.forEach(function(c){ byId[c.id]=c; });
  window.__MOCK__ = { delay: 300, holdAfter: Infinity, served: 0 };   // holdAfter 件目以降の書き込み応答を止める（「実行中」の撮影用）
  window.__MOCK__.revocations = [];
  var realSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function(){
    if (this.action === 'https://oauth2.googleapis.com/revoke') {
      window.__MOCK__.revocations.push({method:this.method, target:this.target, token:this.querySelector('input[name="token"]')?.value || ''});
      return;
    }
    return realSubmit.call(this);
  };
  var pending = [];
  window.__MOCK__.release = function(){ pending.splice(0).forEach(function(f){ f(); }); };
  function later(make){ return new Promise(function(r){ var go = function(){ setTimeout(function(){ r(make()); }, window.__MOCK__.delay); }; if (window.__MOCK__.served++ >= window.__MOCK__.holdAfter) pending.push(go); else go(); }); }
  function json(status, body){ return new Response(JSON.stringify(body), {status:status, headers:{'Content-Type':'application/json'}}); }
  var realFetch = window.fetch;
  window.fetch = function(url, opts){
    url = String(url); opts = opts || {};
    if (url.indexOf('oauth2.googleapis.com/tokeninfo') >= 0) return Promise.resolve(json(200, {aud:'mock-client', scope:'https://www.googleapis.com/auth/calendar.calendarlist', expires_in: 3500}));
    if (url.indexOf('oauth2.googleapis.com/revoke') >= 0) return Promise.resolve(json(200, {}));
    if (url.indexOf('/users/me/calendarList') >= 0) {
      if (!opts.method || opts.method === 'GET') return Promise.resolve(json(200, {items: cals}));
      if (opts.method === 'POST') { var b = JSON.parse(opts.body||'{}'); return later(function(){ if (/notshared/.test(b.id)) return json(404, {error:{message:'Not Found'}}); byId[b.id] = b; cals.push(b); return json(200, b); }); }
      if (opts.method === 'PATCH') return later(function(){ return json(200, {}); });
    }
    return realFetch.apply(this, arguments);
  };
  window.google = { script: { url: { getLocation: function(cb){ cb({ hash: LOGGED_IN ? '#access_token=mock&expires_in=3500&state=manual-mock-state' : '' }); } }, history: { replace: function(){} } } };
})();
</script>`;
  html = html.replace("<?!= includeFile('app') ?>", mock + readFileSync(join(SRC_DIR, 'app.html'), 'utf8'));
  return html;
}

/** 受け取った人の説明で使うサンプル CSV（配布する人が作ったもの、という設定） */
export const SAMPLE_CSV = [
  ['表示名', '正規のカレンダー名', 'メールアドレス / カレンダーID', 'アクセス権限', 'カラーコード'],
  ['【共用】会議室A（3F）', '会議室A', 'c_room_a@group.calendar.google.com', '編集可', '#8e24aa'],
  ['営業チーム', '営業チーム', 'c_sales@group.calendar.google.com', 'オーナー', '#0b8043'],
  ['採用面接', '採用面接', 'c_hiring@group.calendar.google.com', '閲覧のみ', '#039be5'],
  ['総務からのお知らせ', '総務からのお知らせ', 'c_soumu@group.calendar.google.com', '閲覧のみ', '#e67c73'],
  ['役員会', '役員会', 'c_notshared_board@group.calendar.google.com', '閲覧のみ', '#3f51b5'],
  ['山田 太郎（営業）', 'yamada.taro@example.com', 'yamada.taro@example.com', 'オーナー', '#4285f4'],
  ['テスト', 'テスト', 'not-an-id', '閲覧のみ', '#000000'],
].map((r) => r.join(',')).join('\n');
