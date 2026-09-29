import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_DIR = fileURLToPath(new URL('../../', import.meta.url));
export const MANUAL_CONFIG_FILE = join(PROJECT_DIR, 'tooling', 'manual.json');

export function validatePublisher(value) {
  const publisher = typeof value === 'string' ? value.trim() : '';
  if (!publisher) throw new Error('発行者名が空です。');
  if (publisher.length > 80) throw new Error('発行者名は80文字以内で指定してください。');
  if (/[\u0000-\u001f\u007f]/.test(publisher)) throw new Error('発行者名に制御文字は使えません。');
  return publisher;
}

export function readManualConfig() {
  if (!existsSync(MANUAL_CONFIG_FILE)) {
    throw new Error('tooling/manual.json がありません。npm run setup -- --publisher "発行者名" を実行してください。');
  }
  let config;
  try {
    config = JSON.parse(readFileSync(MANUAL_CONFIG_FILE, 'utf8'));
  } catch (error) {
    throw new Error(`tooling/manual.json をJSONとして読めません: ${error.message}`);
  }
  return { publisher: validatePublisher(config.publisher) };
}

export function writeManualConfig(publisher) {
  const config = { publisher: validatePublisher(publisher) };
  writeFileSync(MANUAL_CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  return config;
}
