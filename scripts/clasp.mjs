import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
// Keep credentials and configuration local even when called from another cwd.
if (args.some(arg => /^(--(?:auth|project|user|ignore|adc|allow-symlinks))(=|$)|^-[APuI]/.test(arg))) {
  console.error('認証・接続先の上書きはこのラッパーでは使用できません。README.mdを参照してください。');
  process.exit(1);
}
process.chdir(root);
process.umask(0o077);
for (const dir of ['.local', '.local/clasp']) {
  if (existsSync(dir) && lstatSync(dir).isSymbolicLink()) {
    throw new Error(`認証保存先にはシンボリックリンクを使用できません: ${dir}`);
  }
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
}
const authFile = path.join(root, '.local/clasp/.clasprc.json');
if (existsSync(authFile)) {
  if (lstatSync(authFile).isSymbolicLink()) throw new Error('認証ファイルがシンボリックリンクです。');
  chmodSync(authFile, 0o600);
}
let projectFile = root;
if (args[0] === 'login') {
  // clasp 3.4.1 requires a scriptId to read a scope manifest even during login.
  // This local sentinel is used only by login; it is never sent to a project API.
  const authProject = path.join(root, '.local/clasp/login-scopes');
  mkdirSync(authProject, { recursive: true, mode: 0o700 });
  const scopes = JSON.parse(readFileSync('tooling/clasp-oauth-scopes.json', 'utf8'));
  writeFileSync(path.join(authProject, '.clasp.json'), JSON.stringify({ scriptId: 'LOCAL_LOGIN_SCOPES_ONLY', rootDir: '.' }));
  writeFileSync(path.join(authProject, 'appsscript.json'), JSON.stringify({ oauthScopes: scopes }));
  projectFile = authProject;
  if (!args.includes('--use-project-scopes')) args.push('--use-project-scopes');
}
const entry = path.join(root, 'node_modules/@google/clasp/build/src/index.js');
if (!existsSync(entry)) throw new Error('このプロジェクトで npm ci を実行してください。');
process.argv = [process.execPath, entry, '--auth', authFile, '--project', projectFile,
  '--ignore', path.join(root, '.claspignore'), ...args];
await import(pathToFileURL(entry).href);
