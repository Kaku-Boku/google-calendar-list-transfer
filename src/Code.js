/**
 * 配信者ごとの設定は Git 対象外の LocalConfig.js に置く。
 * @type {{oauthClientId: string, supportEmail: string} | undefined}
 */
var PRIVATE_APP_CONFIG;

/** @returns {{oauthClientId: string, supportEmail: string}} */
function getAppConfig_() {
  if (!PRIVATE_APP_CONFIG || !PRIVATE_APP_CONFIG.oauthClientId || !PRIVATE_APP_CONFIG.supportEmail) {
    throw new Error('src/LocalConfig.js に OAuth クライアント ID と連絡先を設定してください。');
  }
  return PRIVATE_APP_CONFIG;
}

/**
 * Webアプリの入口。匿名アクセス可・実行ユーザーは配信者。
 * このスクリプト自体は Google サービスのスコープを一切持たず、画面（HTML）を返すだけ。
 * 利用者の認証とカレンダー操作は、ブラウザー側が Google の OAuth（アカウント選択画面つき）で
 * 取得したトークンを使って Calendar API を直接呼ぶ。script.google.com のアカウント判定に
 * 依存しないため、複数アカウント同時ログインでも任意のアカウントで使える。
 * @param {GoogleAppsScript.Events.DoGet} e
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet(e) {
  const config = getAppConfig_();
  // OAuth 同意画面のリンク先（プライバシーポリシー）を同じWebアプリで配信する
  if (e && e.parameter && e.parameter.page === 'privacy') {
    const privacy = HtmlService.createTemplateFromFile('privacy');
    privacy.supportEmail = config.supportEmail;
    return privacy.evaluate()
      .setTitle('カレンダー一括登録 プライバシーポリシー')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }
  const template = HtmlService.createTemplateFromFile('index');
  Object.assign(template, {
    clientId: config.oauthClientId,
    appUrl: ScriptApp.getService().getUrl(),
  });
  return template
    .evaluate()
    .setTitle('カレンダー一括登録')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * テンプレートからHTML部品を読み込む。
 * @param {string} name
 * @returns {string}
 */
function includeFile(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/**
 * 開発環境の動作確認。カレンダーなどのデータは変更しません。
 * @returns {string}
 */
function healthCheck() {
  return 'GAS development environment is ready.';
}
