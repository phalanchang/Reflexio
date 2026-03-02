const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// 全ルートに認証ミドルウェアを適用
router.use(requireAuth);

// GET /api/tags - ユーザーの全タグ一覧
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name FROM tags WHERE user_id = ? ORDER BY name ASC',
      [req.session.userId]
    );

    res.json({ tags: rows });
  } catch (error) {
    console.error('タグ一覧取得エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
