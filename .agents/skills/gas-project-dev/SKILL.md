---
name: gas-project-dev
description: このプロジェクトのGoogle Apps Scriptをclaspで開発し、プロジェクト専用の認証・同期・MCPを扱う。GASソース、マニフェスト、カレンダー一括処理の実装や検証に使用する。
---

# GASプロジェクト開発

## ローカル構成

最初にルートの `README.md`、`package.json`、`.clasp.json`、`src/appsscript.json` を確認する。
`.clasp.json` の `scriptId` が未設定ならオンラインプロジェクトは未作成である。

- CLIは `npm run clasp -- <command>` を使う。固定版のGoogle公式claspを起動し、認証を `.local/clasp/.clasprc.json` に限定するラッパーである。
- `npm run gas:login` は開発操作に必要なスコープだけでGoogleの同意画面を開く。利用者がアカウントを選択し同意する。認可コードを会話に貼らせない。
- `tooling/clasp-oauth-scopes.json` は開発者のCLI用。`src/appsscript.json` の `oauthScopes` はアプリ実行用。この二つを混同しない。
- `npm run gas:create` は新規の独立型GASを作成し、ローカルソースを保存したまま接続する。新規作成の結果が不明な場合はApps Script一覧で確認し、重複作成を避ける。
- `tooling/LocalConfig.example.js` を `src/LocalConfig.js` にコピーし、自分の OAuth クライアント ID と連絡先を設定する。このファイルは Git 対象外で、GAS へのアップロード対象である。
- 認証保存先を変えるためにHOMEやCODEX_HOMEを変更しない。グローバル設定を変更しない。

## 実装

GASサーバーコードは `src/` の通常のJavaScriptとJSDocで書く。Node.jsの `require`、`process`、`fs`、ブラウザーのDOMなどをGASサーバー側に持ち込まない。
HTML Serviceのブラウザー側JavaScriptとは実行環境が異なる。
GAS実行時の権限は使用するサービスに合わせて必要なスコープを明示する。現在のひな形は権限不要である。

このアプリは登録済みカレンダーの一覧を CSV で受け渡しする。予定の内容は扱わない。
CSV の入力検証と差分プレビューを登録操作より先に行う。既存のカレンダーは重複登録せず、表示名・色・表示状態の差分だけを更新する。
部分失敗後はカレンダーリストの実際の状態を再取得してから再実行する。
実行時間やAPI割当は固定の記憶に頼らず、該当する公式資料を確認する。

## 検証と反映

1. `npm run check` でGAS用の型を確認する。これはGoogle上での実行確認ではない。
2. `npm run gas:status` でアップロード対象を確認する。対象は `src/` のソースとマニフェストに限定する。
3. Googleへの反映が依頼されている場合に `npm run gas:push` を使う。既存のリモート変更があり得る場合は取得・比較し、ローカル編集を上書きするpullの前に差分を保全する。
4. `push` はHEADを更新する。既存トリガーなどに影響し得るため、デプロイとは区別する。
5. 公開、トリガー作成、カレンダーへの実データ登録は依頼された範囲で実施する。既に許可された操作について繰り返し確認しない。

MCPはGoogle公式claspの実験的機能である。設定の有効ツール一覧を確認し、`projectDir` にはこのプロジェクトの絶対パスを指定する。
MCPのcwd指定はファイルアクセスやGoogleの認可範囲を隔離する仕組みではない。
スキル自体にもアクセスを強制的に制限する機能はない。

## 公式資料

- claspのコマンド・認証: https://github.com/google/clasp
- GAS開発環境: https://developers.google.com/apps-script/guides/clasp
- スコープ: https://developers.google.com/apps-script/concepts/scopes
- V8実行環境: https://developers.google.com/apps-script/guides/v8-runtime
- 性能: https://developers.google.com/apps-script/guides/support/best-practices
- 割当: https://developers.google.com/apps-script/guides/services/quotas
- Calendarサービス: https://developers.google.com/apps-script/reference/calendar
