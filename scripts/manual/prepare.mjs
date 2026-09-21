#!/usr/bin/env node
// ローカルのデプロイURLから、Git対象外の操作マニュアルを作る。
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const projectDir = fileURLToPath(new URL('../../', import.meta.url));
const templateDir = join(projectDir, 'docs', 'manual-template');
const outputDir = join(projectDir, 'docs', 'manual');
const deploymentFile = join(projectDir, 'tooling', 'deployment.json');

let explicitUrl = '';
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--url') explicitUrl = process.argv[++i] || '';
  else throw new Error(`不明な引数: ${process.argv[i]}`);
}

let webAppUrl = explicitUrl || process.env.MANUAL_WEB_APP_URL || '';
if (!webAppUrl && existsSync(deploymentFile)) {
  const { deploymentId } = JSON.parse(readFileSync(deploymentFile, 'utf8'));
  if (deploymentId) webAppUrl = `https://script.google.com/macros/s/${deploymentId}/exec`;
}
if (!webAppUrl) {
  throw new Error('WebアプリURLがありません。MANUAL_WEB_APP_URL を指定するか、先に gas:deploy を実行してください。');
}

const parsed = new URL(webAppUrl);
if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com' ||
    !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(parsed.pathname) ||
    parsed.search || parsed.hash || parsed.username || parsed.password) {
  throw new Error('WebアプリURLは https://script.google.com/macros/s/<deploymentId>/exec 形式で指定してください。');
}
webAppUrl = parsed.href;

const escapeHtml = (value) => value.replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[ch]);
const qr = await QRCode.toString(webAppUrl, {
  type: 'svg', errorCorrectionLevel: 'M', margin: 1,
  color: { dark: '#1D252D', light: '#FFFFFF' }
});

const template = readFileSync(join(templateDir, 'index.html'), 'utf8');
if ((template.match(/\{\{WEB_APP_URL\}\}/g) || []).length !== 2 ||
    (template.match(/\{\{WEB_APP_QR\}\}/g) || []).length !== 1) {
  throw new Error('マニュアル原稿のURL・QRプレースホルダーを確認してください。');
}
const html = template.replaceAll('{{WEB_APP_URL}}', escapeHtml(webAppUrl))
  .replace('{{WEB_APP_QR}}', qr);
mkdirSync(outputDir, { recursive: true });
for (const name of ['document.css', 'manual.css']) {
  copyFileSync(join(templateDir, name), join(outputDir, name));
}
writeFileSync(join(outputDir, 'index.html'), html);
console.log('ローカルマニュアルを生成しました:', outputDir);
