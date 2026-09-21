@AGENTS.md

## Claude Code での補足

- 上記の共通指示は `AGENTS.md`（Codexと共用）から読み込んでいる。共通の作業ルールを変更する時は `AGENTS.md` を編集し、このファイルにはClaude Code固有の事項だけを書く。
- スキル `gas-project-dev` は `.claude/skills/gas-project-dev` から使える。実体は `.agents/skills/gas-project-dev/SKILL.md` へのシンボリックリンクなので、編集は `.agents/skills/` 側で行う。
- MCPサーバー `gas_clasp` は `.mcp.json` で定義し、ツールごとの許可は `.claude/settings.json` の `permissions` で管理する（`list_projects` は許可、`pull_files` / `push_files` は都度確認、`create_project` / `clone_project` は拒否）。これは `.codex/config.toml` の `enabled_tools` / `approval_mode` と同じ方針である。
- `.local/` 配下は認証情報のため `permissions.deny` で読み取りを禁止している。認証状態の確認には `npm run gas:auth` を使う。
- 個人用の上書きは `.claude/settings.local.json` と `CLAUDE.local.md` に書く。どちらもGit対象外である。
