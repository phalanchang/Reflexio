const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { GOOGLE_EVENT_COLORS } = require('../config/google');

// 全ルートに認証ミドルウェアを適用
router.use(requireAuth);

// GET /api/category-mappings — ユーザーのカテゴリマッピング一覧取得
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT google_color_id, category_name, display_color FROM category_mappings WHERE user_id = ? ORDER BY google_color_id',
      [req.session.userId]
    );

    res.json({
      mappings: rows,
      defaults: GOOGLE_EVENT_COLORS
    });
  } catch (error) {
    console.error('カテゴリマッピング取得エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/category-mappings — 一括アップサート
router.put('/', async (req, res) => {
  try {
    const { mappings } = req.body;

    // バリデーション: mappings は配列
    if (!Array.isArray(mappings)) {
      return res.status(400).json({ error: 'mappings は配列で指定してください' });
    }

    // 各マッピングのバリデーション
    for (const mapping of mappings) {
      const colorId = parseInt(mapping.google_color_id);
      if (!Number.isInteger(colorId) || colorId < 1 || colorId > 11) {
        return res.status(400).json({ error: `google_color_id は 1-11 の整数で指定してください（値: ${mapping.google_color_id}）` });
      }

      if (!mapping.category_name || typeof mapping.category_name !== 'string' || !mapping.category_name.trim()) {
        return res.status(400).json({ error: 'category_name は空でない文字列で指定してください' });
      }
      if (mapping.category_name.trim().length > 100) {
        return res.status(400).json({ error: 'category_name は100文字以内で指定してください' });
      }

      if (!mapping.display_color || !/^#[0-9a-fA-F]{6}$/.test(mapping.display_color)) {
        return res.status(400).json({ error: 'display_color は # + 6桁の16進数で指定してください（例: #ff0000）' });
      }
    }

    // トランザクションで全削除 → INSERT
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 既存マッピングを全削除
      await connection.execute(
        'DELETE FROM category_mappings WHERE user_id = ?',
        [req.session.userId]
      );

      // 新規INSERT
      for (const mapping of mappings) {
        await connection.execute(
          'INSERT INTO category_mappings (user_id, google_color_id, category_name, display_color) VALUES (?, ?, ?, ?)',
          [req.session.userId, parseInt(mapping.google_color_id), mapping.category_name.trim(), mapping.display_color]
        );
      }

      await connection.commit();
    } catch (txError) {
      await connection.rollback();
      throw txError;
    } finally {
      connection.release();
    }

    res.json({ message: 'カテゴリ設定を保存しました', count: mappings.length });
  } catch (error) {
    console.error('カテゴリマッピング保存エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/category-mappings/:colorId — 単一マッピング削除
router.delete('/:colorId', async (req, res) => {
  try {
    const colorId = parseInt(req.params.colorId);
    if (!Number.isInteger(colorId) || colorId < 1 || colorId > 11) {
      return res.status(400).json({ error: 'colorId は 1-11 の整数で指定してください' });
    }

    const [result] = await pool.execute(
      'DELETE FROM category_mappings WHERE user_id = ? AND google_color_id = ?',
      [req.session.userId, colorId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '指定されたカテゴリ設定が見つかりません' });
    }

    res.json({ message: 'カテゴリ設定を削除しました' });
  } catch (error) {
    console.error('カテゴリマッピング削除エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
