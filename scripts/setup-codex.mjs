#!/usr/bin/env node
// このチェックアウト専用のMCP設定を生成する。絶対パスはGit対象外に置く。
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const script = join(root, 'scripts', 'clasp.mjs');
const tomlString = (value) => JSON.stringify(value);
const content = `[mcp_servers.gas_clasp]
command = ${tomlString(process.execPath)}
args = [${tomlString(script)}, "mcp"]
cwd = ${tomlString(root)}
enabled = true
startup_timeout_sec = 20
tool_timeout_sec = 60
enabled_tools = ["list_projects", "pull_files", "push_files"]
default_tools_approval_mode = "writes"

[mcp_servers.gas_clasp.tools.list_projects]
approval_mode = "auto"
`;
mkdirSync(join(root, '.codex'), { recursive: true });
writeFileSync(join(root, '.codex', 'config.toml'), content, { mode: 0o600 });
console.log('このチェックアウト専用の .codex/config.toml を生成しました。');
