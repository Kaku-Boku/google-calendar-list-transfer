import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Webアプリのデプロイを作成・更新する。デプロイIDは tooling/deployment.json に保持し、
// 同じIDを更新し続けることで利用者に配る /exec URL を固定する。
// push はここでは行わない（package.json の gas:deploy が check → push → 本スクリプトの順に実行する）。
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

const deploymentFile = 'tooling/deployment.json';
const description = process.argv.slice(2).join(' ') || `deploy ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

if (!existsSync('.clasp.json') || !JSON.parse(readFileSync('.clasp.json', 'utf8')).scriptId) {
  console.error('.clasp.json にスクリプトIDがありません。先に npm run gas:create で接続してください。');
  process.exit(1);
}
if (!existsSync('.local/clasp/.clasprc.json')) {
  console.error('先に npm run gas:login でGoogle認証を完了してください。');
  process.exit(1);
}

let deploymentId = '';
if (existsSync(deploymentFile)) {
  deploymentId = JSON.parse(readFileSync(deploymentFile, 'utf8')).deploymentId || '';
}

const args = ['scripts/clasp.mjs', '--json', 'create-deployment', '-d', description];
if (deploymentId) args.push('-i', deploymentId);

const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] });
if (result.error) throw result.error;
if (result.status !== 0) {
  process.stdout.write(result.stdout || '');
  console.error('デプロイに失敗しました。script.deployments スコープで再ログイン済みか確認してください（npm run gas:login）。');
  process.exit(result.status ?? 1);
}

// spinner等の出力が混ざる場合に備え、最後のJSONブロックだけを取り出す
const match = (result.stdout || '').match(/\{[\s\S]*\}\s*$/);
if (!match) {
  process.stdout.write(result.stdout || '');
  console.error('デプロイ結果を解釈できませんでした。');
  process.exit(1);
}
const output = JSON.parse(match[0]);
if (!output.deploymentId) {
  console.error('デプロイIDが取得できませんでした。');
  process.exit(1);
}
if (output.deploymentId !== deploymentId) {
  writeFileSync(deploymentFile, `${JSON.stringify({ deploymentId: output.deploymentId }, null, 2)}\n`);
  console.log(`デプロイIDを ${deploymentFile} に保存しました。`);
}
console.log(`デプロイ完了: ${output.deploymentId} @${output.versionNumber ?? 'HEAD'}`);
console.log(`WebアプリURL: https://script.google.com/macros/s/${output.deploymentId}/exec`);
