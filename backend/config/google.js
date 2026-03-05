const { google } = require('googleapis');
const pool = require('./database');

// OAuth2 クライアント生成（ユーザー設定 → 環境変数フォールバック）
// redirectUri: 指定があればそれを使用、なければ環境変数にフォールバック
async function createOAuth2Client(userId, redirectUri) {
  let clientId = process.env.GOOGLE_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // ユーザー個別設定があればそちらを優先
  if (userId) {
    const [rows] = await pool.execute(
      'SELECT client_id, client_secret FROM google_oauth_settings WHERE user_id = ?',
      [userId]
    );
    if (rows.length > 0) {
      clientId = rows[0].client_id;
      clientSecret = rows[0].client_secret;
    }
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri || process.env.GOOGLE_REDIRECT_URI
  );
}

// 認証済み Google クライアント取得（自動リフレッシュ付き）
async function getAuthenticatedClient(userId) {
  // 1. DBからトークン取得
  const [rows] = await pool.execute(
    'SELECT access_token, refresh_token, expires_at FROM google_tokens WHERE user_id = ?',
    [userId]
  );

  if (rows.length === 0) {
    return null; // 未接続
  }

  const tokenData = rows[0];
  const oauth2Client = await createOAuth2Client(userId);

  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
  });

  // 2. トークン期限チェック（5分前にリフレッシュ）
  const now = new Date();
  const expiresAt = new Date(tokenData.expires_at);
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
    // トークンリフレッシュ
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    // DBを更新
    const newExpiresAt = new Date(credentials.expiry_date);
    await pool.execute(
      'UPDATE google_tokens SET access_token = ?, expires_at = ?, updated_at = NOW() WHERE user_id = ?',
      [credentials.access_token, newExpiresAt, userId]
    );
  }

  return oauth2Client;
}

// Google Event Colors（colorId 1-11）のデフォルト名と色
const GOOGLE_EVENT_COLORS = {
  1: { name: 'ラベンダー', color: '#7986cb' },
  2: { name: 'セージ', color: '#33b679' },
  3: { name: 'ブドウ', color: '#8e24aa' },
  4: { name: 'フラミンゴ', color: '#e67c73' },
  5: { name: 'バナナ', color: '#f6bf26' },
  6: { name: 'みかん', color: '#f4511e' },
  7: { name: 'ピーコック', color: '#039be5' },
  8: { name: 'グラファイト', color: '#616161' },
  9: { name: 'ブルーベリー', color: '#3f51b5' },
  10: { name: 'バジル', color: '#0b8043' },
  11: { name: 'トマト', color: '#d50000' },
};

module.exports = { createOAuth2Client, getAuthenticatedClient, GOOGLE_EVENT_COLORS };
