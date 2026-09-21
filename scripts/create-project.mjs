import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const configPath = '.clasp.json';
if (existsSync(configPath) && JSON.parse(readFileSync(configPath, 'utf8')).scriptId) {
  throw new Error('このフォルダは既にGASに接続されています。重複作成を停止しました。');
}
if (!existsSync('.local/clasp/.clasprc.json')) {
  console.error('先に npm run gas:login でGoogle認証を完了してください。');
  process.exit(1);
}
// New-project downloads go into a private directory to preserve local source.
const result = spawnSync(process.execPath, ['scripts/clasp.mjs', 'create-script',
  '--type', 'standalone', '--title', 'Googleカレンダー一括登録',
  '--rootDir', '.local/created-script'], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) {
  console.error('作成に失敗しました。作成済みURLが表示された場合は再試行前にGoogle側を確認してください。');
  process.exit(result.status ?? 1);
}
const config = JSON.parse(readFileSync(configPath, 'utf8'));
if (!config.scriptId) throw new Error('作成結果にスクリプトIDがありません。再作成せずGoogle側を確認してください。');
config.rootDir = 'src';
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
console.log('GASに接続しました。src/の内容は npm run gas:push で反映できます。');
