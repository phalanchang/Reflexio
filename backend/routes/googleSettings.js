const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// 全ルートに認証ミドルウェアを適用
router.use(requireAuth);

// GET /api/google/settings — 自分のOAuth設定取得
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT client_id, client_secret, updated_at FROM google_oauth_settings WHERE user_id = ?',
      [req.session.userId]
    );

    if (rows.length === 0) {
      return res.json({ hasSettings: false, settings: null });
    }

    const settings = rows[0];
    // client_secret をマスク（最後4文字以外を **** に）
    const maskedSecret = settings.client_secret.length > 4
      ? '****' + settings.client_secret.slice(-4)
      : '****';

    res.json({
      hasSettings: true,
      settings: {
        client_id: settings.client_id,
        client_secret: maskedSecret,
        updated_at: settings.updated_at
      }
    });
  } catch (error) {
    console.error('OAuth設定取得エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/google/settings — OAuth設定保存
router.post('/', async (req, res) => {
  try {
    const { client_id, client_secret } = req.body;

    // バリデーション
    if (!client_id || !client_id.trim()) {
      return res.status(400).json({ error: 'Client ID は必須です' });
    }
    if (!client_secret || !client_secret.trim()) {
      return res.status(400).json({ error: 'Client Secret は必須です' });
    }

    // 既存チェック
    const [existing] = await pool.execute(
      'SELECT id FROM google_oauth_settings WHERE user_id = ?',
      [req.session.userId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: '設定は既に存在します。更新する場合は PUT を使用してください' });
    }

    await pool.execute(
      'INSERT INTO google_oauth_settings (user_id, client_id, client_secret) VALUES (?, ?, ?)',
      [req.session.userId, client_id.trim(), client_secret.trim()]
    );

    res.status(201).json({ message: 'OAuth設定を保存しました' });
  } catch (error) {
    console.error('OAuth設定保存エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/google/settings — OAuth設定更新
router.put('/', async (req, res) => {
  try {
    const { client_id, client_secret } = req.body;

    if (!client_id || !client_id.trim()) {
      return res.status(400).json({ error: 'Client ID は必須です' });
    }
    if (!client_secret || !client_secret.trim()) {
      return res.status(400).json({ error: 'Client Secret は必須です' });
    }

    const [result] = await pool.execute(
      'UPDATE google_oauth_settings SET client_id = ?, client_secret = ?, updated_at = NOW() WHERE user_id = ?',
      [client_id.trim(), client_secret.trim(), req.session.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '設定が見つかりません' });
    }

    // 設定変更時、既存のトークンを無効化（client_idが変わるとトークンは使えなくなるため）
    await pool.execute(
      'DELETE FROM google_tokens WHERE user_id = ?',
      [req.session.userId]
    );

    res.json({ message: 'OAuth設定を更新しました（Google接続はリセットされました）' });
  } catch (error) {
    console.error('OAuth設定更新エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/google/settings — OAuth設定削除（接続も解除）
router.delete('/', async (req, res) => {
  try {
    // まずトークン削除（revoke含む）
    const { getAuthenticatedClient } = require('../config/google');
    let oauth2Client = null;
    try {
      oauth2Client = await getAuthenticatedClient(req.session.userId);
    } catch (e) {
      // トークン取得失敗は無視
    }
    if (oauth2Client) {
      try { await oauth2Client.revokeCredentials(); } catch (e) { /* 無視 */ }
    }
    await pool.execute('DELETE FROM google_tokens WHERE user_id = ?', [req.session.userId]);

    // 設定削除
    const [result] = await pool.execute(
      'DELETE FROM google_oauth_settings WHERE user_id = ?',
      [req.session.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '設定が見つかりません' });
    }

    res.json({ message: 'OAuth設定を削除しました' });
  } catch (error) {
    console.error('OAuth設定削除エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
