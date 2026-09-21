import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const path = join(root, 'src', 'LocalConfig.js');
if (!existsSync(path)) {
  throw new Error('tooling/LocalConfig.example.js を src/LocalConfig.js にコピーして設定してください。');
}
const match = readFileSync(path, 'utf8').trim().match(/^var PRIVATE_APP_CONFIG\s*=\s*(\{[\s\S]*\});$/);
if (!match) throw new Error('src/LocalConfig.js の形式を確認してください。');
const config = JSON.parse(match[1]);
if (!/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(config.oauthClientId || '')) {
  throw new Error('src/LocalConfig.js の OAuth クライアント ID を設定してください。');
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.supportEmail || '')) {
  throw new Error('src/LocalConfig.js の連絡先メールアドレスを設定してください。');
}
console.log('ローカルGAS設定を確認しました。');
