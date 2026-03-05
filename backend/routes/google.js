const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { createOAuth2Client, getAuthenticatedClient } = require('../config/google');
const crypto = require('crypto');

// 全ルートに認証ミドルウェアを適用
router.use(requireAuth);

// GET /api/google/auth/url — OAuth 同意画面 URL 生成
router.get('/auth/url', async (req, res) => {
  try {
    // redirect_uri は環境変数から取得（Google OAuth は localhost のみ許可）
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3003/auth/google/callback';

    const oauth2Client = await createOAuth2Client(req.session.userId, redirectUri);

    // CSRF防止用 state パラメータ
    const state = crypto.randomBytes(32).toString('hex');
    req.session.googleOAuthState = state;

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar.readonly'],
      state: state,
    });

    res.json({ url });
  } catch (error) {
    console.error('OAuth URL生成エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/google/auth/callback — authorization code でトークン交換
router.post('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ error: '認証コードが必要です' });
    }

    // CSRF防止: state パラメータ照合
    if (!state || state !== req.session.googleOAuthState) {
      return res.status(400).json({ error: '無効なリクエストです（state不一致）' });
    }

    // state を使い回し防止で削除
    delete req.session.googleOAuthState;

    // redirect_uri は auth/url と同じ固定値を使用
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3003/auth/google/callback';
    const oauth2Client = await createOAuth2Client(req.session.userId, redirectUri);

    // トークン交換
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // refresh_token 存在チェック
    if (!tokens.refresh_token) {
      return res.status(500).json({
        error: 'Google から refresh_token が取得できませんでした。再度お試しください'
      });
    }

    // メールアドレス取得
    let googleEmail = null;
    try {
      const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);
      googleEmail = tokenInfo.email || null;
    } catch (emailError) {
      console.error('メールアドレス取得エラー（続行）:', emailError);
    }

    // トークン期限
    const expiresAt = new Date(tokens.expiry_date);
    const scope = tokens.scope || 'https://www.googleapis.com/auth/calendar.readonly';

    // DB に UPSERT
    await pool.execute(
      `INSERT INTO google_tokens (user_id, access_token, refresh_token, token_type, expires_at, scope, google_email)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         access_token = VALUES(access_token),
         refresh_token = VALUES(refresh_token),
         token_type = VALUES(token_type),
         expires_at = VALUES(expires_at),
         scope = VALUES(scope),
         google_email = VALUES(google_email),
         updated_at = NOW()`,
      [
        req.session.userId,
        tokens.access_token,
        tokens.refresh_token,
        tokens.token_type || 'Bearer',
        expiresAt,
        scope,
        googleEmail
      ]
    );

    res.json({ message: 'Google カレンダーを接続しました', email: googleEmail });
  } catch (error) {
    console.error('OAuthコールバックエラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/google/auth/status — 接続状態確認
router.get('/auth/status', async (req, res) => {
  try {
    // OAuth設定の有無を確認
    const [settingsRows] = await pool.execute(
      'SELECT id FROM google_oauth_settings WHERE user_id = ?',
      [req.session.userId]
    );
    const hasSettings = settingsRows.length > 0;

    // 環境変数フォールバックチェック
    const hasEnvConfig = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      && process.env.GOOGLE_CLIENT_ID !== 'your-client-id'
      && process.env.GOOGLE_CLIENT_SECRET !== 'your-client-secret');

    const [rows] = await pool.execute(
      'SELECT google_email FROM google_tokens WHERE user_id = ?',
      [req.session.userId]
    );

    if (rows.length === 0) {
      return res.json({
        connected: false,
        hasSettings: hasSettings,
        hasEnvConfig: hasEnvConfig
      });
    }

    res.json({
      connected: true,
      email: rows[0].google_email,
      hasSettings: hasSettings,
      hasEnvConfig: hasEnvConfig
    });
  } catch (error) {
    console.error('接続状態確認エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/google/auth/disconnect — トークン削除 + Google revoke
router.post('/auth/disconnect', async (req, res) => {
  try {
    const userId = req.session.userId;

    // トークン取得を個別にtry/catch（失敗しても続行）
    let oauth2Client = null;
    try {
      oauth2Client = await getAuthenticatedClient(userId);
    } catch (refreshError) {
      console.error('トークン取得失敗（DB削除は続行）:', refreshError.message);
    }

    // revoke（クライアント取得できた場合のみ）
    if (oauth2Client) {
      try {
        await oauth2Client.revokeCredentials();
      } catch (revokeError) {
        console.error('Google revoke失敗（DB削除は続行）:', revokeError.message);
      }
    }

    // DB削除は必ず実行
    await pool.execute('DELETE FROM google_tokens WHERE user_id = ?', [userId]);

    res.json({ message: 'Google カレンダーの接続を解除しました' });
  } catch (error) {
    console.error('Google切断エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
