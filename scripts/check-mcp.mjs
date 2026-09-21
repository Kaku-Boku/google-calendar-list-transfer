import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
// Use the SDK shipped with the pinned official clasp package.
import { createRequire } from 'node:module';
const requireFromClasp = createRequire(new URL('../node_modules/@google/clasp/package.json', import.meta.url));
const { Client } = await import(requireFromClasp.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StdioClientTransport } = await import(requireFromClasp.resolve('@modelcontextprotocol/sdk/client/stdio.js'));
const root = fileURLToPath(new URL('../', import.meta.url));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['scripts/clasp.mjs', 'mcp'],
  cwd: root,
  stderr: 'inherit'
});
const client = new Client({ name: 'gas-local-setup-check', version: '1.0.0' });
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const expected = ['clone_project', 'create_project', 'list_projects', 'pull_files', 'push_files'];
  assert.deepEqual(tools.map(tool => tool.name).sort(), expected);
  console.log(`MCP起動・初期化・ツール一覧: OK (${tools.length} tools)`);
  console.log('Google APIへの操作は実行していません。');
} finally {
  await client.close();
}
