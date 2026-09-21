# Google Calendar List Transfer

Google カレンダーの「登録済みカレンダー一覧」を CSV で受け渡しし、別のアカウントにまとめて登録する Apps Script Web アプリです。表示名・色・表示状態を扱います。**予定の内容は読み書きしません。** 画面と操作マニュアルは日本語です。

## できること

- 配布する人: 登録済みカレンダーの一覧を CSV に書き出す
- 受け取る人: CSV を確認し、未登録のカレンダーを追加し、表示名や色の差分だけを更新する
- 実行前に対象・変更内容を確認し、途中経過と結果を見る

利用者は画面の「Googleでログイン」から操作対象のアカウントを選びます。カレンダーリストと一時的なアクセストークンは利用者のブラウザー内で扱い、アプリ側のデータベースには保存しません。詳しくは [プライバシーポリシーの原稿](src/privacy.html)を参照してください。

## 自分のWebアプリを作る

Node.js 20 以降、Google アカウント、Google Cloud プロジェクト、Google Chrome が必要です。各自の OAuth クライアントとデプロイを使います。

1. `npm ci` を実行します。
2. Google Cloud で **Google Calendar API** を有効にし、外部向けの OAuth 同意画面と「ウェブアプリケーション」型の OAuth クライアントを作ります。アプリが求める権限は `https://www.googleapis.com/auth/calendar.calendarlist` です。
3. `tooling/LocalConfig.example.js` を `src/LocalConfig.js` にコピーし、**自分の** OAuth クライアント ID と問い合わせ先メールアドレスに書き換えます。`src/LocalConfig.js` は Git 対象外ですが、GAS にはアップロードされます。クライアントシークレットは使いません。
4. [Apps Script API を有効化](https://script.google.com/home/usersettings)してから、`npm run gas:login`、`npm run gas:create`、`npm run gas:deploy` を順に実行します。ログイン時の認可コードやトークンを他人に渡さないでください。
5. デプロイで得た `/exec` URL を OAuth クライアントの**承認済みリダイレクト URI**に登録します。同意画面のホームページとプライバシーポリシーには、自分のアプリとその `?page=privacy` ページを設定します。初回ログインとアカウント切り替えを確認してください。
6. `npm run manual` で自分のURL入り操作マニュアルを生成します。HTML・画像・PDF は Git 対象外の `docs/manual/` に置かれます。既存のデプロイを使う場合は `MANUAL_WEB_APP_URL='https://script.google.com/macros/s/<自分のID>/exec' npm run manual` でも更新できます。

URL は Git 対象外の `tooling/deployment.json` に保存され、同じデプロイ ID を更新する限りマニュアルの URL は変わりません。新しいデプロイ ID を作った場合は、OAuth クライアントのリダイレクト URI とマニュアルを更新してください。

## 利用時の注意

このアプリは Google の OAuth 確認を受けていません。利用者に警告が表示される場合があります。配信者と権限を確認し、信頼できる場合にだけ許可してください。Google の規則により、未確認アプリの新規利用者には**プロジェクト累計100人**の上限があります。広い一般公開には向きません。GitHub 上のソース公開と、特定のデプロイを広く利用可能にすることは別です。

Apps Script の HTML Service は `googleusercontent.com` の iframe で動きます。このドメインは Google Identity Services の承認済み JavaScript 生成元に登録できないため、現行のブラウザー側 OAuth 方式を使用しています。ログイン応答の `state`・発行先・権限を検証します。Google はこの直接実装を推奨していないため、用途に応じてホスティングと認証方式を見直してください。[Google の登録規則](https://support.google.com/cloud/answer/15549257?hl=en)・[OAuth ガイド](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)

## 開発

| コマンド | 用途 |
| --- | --- |
| `npm run check` | GAS サーバー側コードの型検査 |
| `npm run check:config` | Git 対象外の配信者設定を確認 |
| `npm run gas:status` | GAS へのアップロード対象を確認 |
| `npm run gas:push` | GAS のソースを更新（公開デプロイは更新しない） |
| `npm run gas:deploy` | 同じデプロイ ID で Web アプリを更新 |
| `npm run manual` | 自分の URL の操作マニュアルを生成 |

GAS ソースは `src/`、マニュアル原稿は `docs/manual-template/`、Node.js の補助スクリプトは `scripts/` です。開発・認証の詳細は [AGENTS.md](AGENTS.md) と [プロジェクト用スキル](.agents/skills/gas-project-dev/SKILL.md)にあります。`.local/`、`.clasp.json`、`src/LocalConfig.js`、`tooling/deployment.json`、生成済みマニュアルは公開しないでください。

## ライセンス

[MIT](LICENSE)
