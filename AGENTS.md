# このプロジェクトでの作業

このファイルはCodexとClaude Codeの共通指示である。Claude Codeは `CLAUDE.md` 経由でこのファイルを読み込む。

- GASの開発・認証・同期では `.agents/skills/gas-project-dev/SKILL.md` を読む。Claude Codeでは同じスキルが `.claude/skills/gas-project-dev`（シンボリックリンク）として見える。編集は `.agents/skills/` 側で行う。
- claspは `npm run clasp -- <command>` または `npm run gas:*` で実行する。プロジェクト専用の認証先を維持する。
- この環境への設定はプロジェクト内に限定する。グローバルnpmインストール、シェル設定、ユーザー全体のCodex設定や `~/.claude/` 配下のClaude Code設定を変更しない。
- GASソースは `src/`。`npm run check` で型を確認する。Node用スクリプトは `scripts/` に置く。
- `.local/` の認証ファイル、OAuth認可コード、トークンをチャット・ログ・Gitに出力しない。
- MCPサーバー `gas_clasp` はCodexでは `.codex/config.toml`、Claude Codeでは `.mcp.json` + `.claude/settings.json` で定義している。有効ツールと承認方針は両者で揃える。MCPの `projectDir` はこのプロジェクトの絶対パスを使う。`cwd` やローカル設定はGoogleアカウントの権限を単一プロジェクトに制限するものではない。
- ローカル編集をGoogle側への反映指示と解釈しない。同期・実行・公開はユーザーが依頼した範囲で行い、セッション内の既存の許可を引き継ぐ。
