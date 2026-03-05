const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// ENUM値のホワイトリスト
const VALID_STATUS = ['not_started', 'in_progress', 'completed'];
const VALID_PRIORITY = ['high', 'medium', 'low'];

// 全ルートに認証ミドルウェアを適用
router.use(requireAuth);

// GET /api/wishes - 一覧取得（自分のwishesのみ、created_at DESC、タグ情報付き）
router.get('/', async (req, res) => {
  try {
    const [wishes] = await pool.execute(
      'SELECT id, user_id, title, description, status, priority, due_date, created_at, updated_at FROM wishes WHERE user_id = ? ORDER BY created_at DESC',
      [req.session.userId]
    );

    // タグ情報をまとめて取得（N+1回避）
    if (wishes.length > 0) {
      const wishIds = wishes.map(w => w.id);
      const placeholders = wishIds.map(() => '?').join(',');
      const [tagRows] = await pool.execute(
        `SELECT wt.wish_id, t.id, t.name FROM wish_tags wt JOIN tags t ON wt.tag_id = t.id WHERE wt.wish_id IN (${placeholders})`,
        wishIds
      );

      const tagMap = {};
      tagRows.forEach(row => {
        if (!tagMap[row.wish_id]) tagMap[row.wish_id] = [];
        tagMap[row.wish_id].push({ id: row.id, name: row.name });
      });
      wishes.forEach(wish => {
        wish.tags = tagMap[wish.id] || [];
      });

      // 画像情報をまとめて取得（N+1回避）
      const [imageRows] = await pool.execute(
        `SELECT id, wish_id, filename, original_name, mime_type, size, created_at FROM wish_images WHERE wish_id IN (${placeholders})`,
        wishIds
      );

      const imageMap = {};
      imageRows.forEach(row => {
        if (!imageMap[row.wish_id]) imageMap[row.wish_id] = [];
        imageMap[row.wish_id].push({
          id: row.id,
          filename: row.filename,
          original_name: row.original_name,
          mime_type: row.mime_type,
          size: row.size,
          created_at: row.created_at
        });
      });
      wishes.forEach(wish => {
        wish.images = imageMap[wish.id] || [];
      });
    } else {
      wishes.forEach(wish => { wish.tags = []; wish.images = []; });
    }

    res.json({ wishes });
  } catch (error) {
    console.error('wishes一覧取得エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/wishes - 新規作成（タグ対応）
router.post('/', async (req, res) => {
  console.log(`[wishes] POST / - userId: ${req.session.userId}, title: ${req.body.title}`);
  try {
    const { title, description, status, priority, due_date, tags } = req.body;

    // タイトル必須バリデーション
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'タイトルは必須です' });
    }

    // ENUM値バリデーション
    if (status && !VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: '無効なステータスです' });
    }
    if (priority && !VALID_PRIORITY.includes(priority)) {
      return res.status(400).json({ error: '無効な優先度です' });
    }

    const wishStatus = status || 'not_started';
    const wishPriority = priority || 'medium';
    const wishDueDate = due_date || null;
    const wishDescription = description || null;

    const [result] = await pool.execute(
      'INSERT INTO wishes (user_id, title, description, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)',
      [req.session.userId, title.trim(), wishDescription, wishStatus, wishPriority, wishDueDate]
    );

    // タグの処理
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        const trimmed = tagName.trim();
        if (!trimmed) continue;

        // INSERT IGNORE でタグ作成（既存なら無視）
        await pool.execute(
          'INSERT IGNORE INTO tags (user_id, name) VALUES (?, ?)',
          [req.session.userId, trimmed]
        );

        // タグIDを取得
        const [tagRows] = await pool.execute(
          'SELECT id FROM tags WHERE user_id = ? AND name = ?',
          [req.session.userId, trimmed]
        );

        if (tagRows.length > 0) {
          // wish_tags に関連付け
          await pool.execute(
            'INSERT IGNORE INTO wish_tags (wish_id, tag_id) VALUES (?, ?)',
            [result.insertId, tagRows[0].id]
          );
        }
      }
    }

    // 作成したレコードを取得
    const [rows] = await pool.execute(
      'SELECT id, user_id, title, description, status, priority, due_date, created_at, updated_at FROM wishes WHERE id = ?',
      [result.insertId]
    );

    // 作成したwishのタグを取得
    const [wishTags] = await pool.execute(
      'SELECT t.id, t.name FROM wish_tags wt JOIN tags t ON wt.tag_id = t.id WHERE wt.wish_id = ?',
      [result.insertId]
    );
    const createdWish = rows[0];
    createdWish.tags = wishTags;

    res.status(201).json({ message: 'やりたいことを作成しました', wish: createdWish });
  } catch (error) {
    console.error('wish作成エラー:', error, '- userId:', req.session.userId);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/wishes/:id - 更新（自分のアイテムのみ、タグ全置換対応）
router.put('/:id', async (req, res) => {
  console.log(`[wishes] PUT /${req.params.id} - userId: ${req.session.userId}`);
  try {
    const { id } = req.params;
    const { title, description, status, priority, due_date, tags } = req.body;

    // タイトル必須バリデーション
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'タイトルは必須です' });
    }

    // ENUM値バリデーション
    if (status && !VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: '無効なステータスです' });
    }
    if (priority && !VALID_PRIORITY.includes(priority)) {
      return res.status(400).json({ error: '無効な優先度です' });
    }

    const wishDescription = description !== undefined ? description : null;
    const wishStatus = status || 'not_started';
    const wishPriority = priority || 'medium';
    const wishDueDate = due_date !== undefined ? due_date : null;

    // 所有権チェック付きで更新
    const [result] = await pool.execute(
      'UPDATE wishes SET title = ?, description = ?, status = ?, priority = ?, due_date = ? WHERE id = ? AND user_id = ?',
      [title.trim(), wishDescription, wishStatus, wishPriority, wishDueDate, id, req.session.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '対象のやりたいことが見つかりません' });
    }

    // タグの更新（全置換）
    if (tags !== undefined && Array.isArray(tags)) {
      // 既存の関連を全削除
      await pool.execute('DELETE FROM wish_tags WHERE wish_id = ?', [id]);

      // 新しいタグを関連付け
      for (const tagName of tags) {
        const trimmed = tagName.trim();
        if (!trimmed) continue;

        await pool.execute(
          'INSERT IGNORE INTO tags (user_id, name) VALUES (?, ?)',
          [req.session.userId, trimmed]
        );

        const [tagRows] = await pool.execute(
          'SELECT id FROM tags WHERE user_id = ? AND name = ?',
          [req.session.userId, trimmed]
        );

        if (tagRows.length > 0) {
          await pool.execute(
            'INSERT IGNORE INTO wish_tags (wish_id, tag_id) VALUES (?, ?)',
            [id, tagRows[0].id]
          );
        }
      }
    }

    // 更新後のレコードを取得
    const [rows] = await pool.execute(
      'SELECT id, user_id, title, description, status, priority, due_date, created_at, updated_at FROM wishes WHERE id = ?',
      [id]
    );

    // 更新後のタグを取得
    const [wishTags] = await pool.execute(
      'SELECT t.id, t.name FROM wish_tags wt JOIN tags t ON wt.tag_id = t.id WHERE wt.wish_id = ?',
      [id]
    );
    const updatedWish = rows[0];
    updatedWish.tags = wishTags;

    res.json({ message: 'やりたいことを更新しました', wish: updatedWish });
  } catch (error) {
    console.error('wish更新エラー:', error, '- userId:', req.session.userId, '- wishId:', req.params.id);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/wishes/:id - 削除（自分のアイテムのみ、画像ファイルクリーンアップ付き）
router.delete('/:id', async (req, res) => {
  console.log(`[wishes] DELETE /${req.params.id} - userId: ${req.session.userId}`);
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    // 削除前に紐づく画像一覧を取得（ファイル物理削除用）
    const [images] = await pool.execute(
      'SELECT filename FROM wish_images WHERE wish_id = ? AND user_id = ?',
      [id, userId]
    );

    // 所有権チェック付きで削除（CASCADE で wish_images レコードも自動削除）
    const [result] = await pool.execute(
      'DELETE FROM wishes WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '対象のやりたいことが見つかりません' });
    }

    // 画像ファイルを物理削除
    images.forEach(img => {
      const filePath = path.join(__dirname, '..', 'uploads', String(userId), img.filename);
      try { fs.unlinkSync(filePath); } catch (e) { /* ファイルがなくても無視 */ }
    });

    res.json({ message: 'やりたいことを削除しました' });
  } catch (error) {
    console.error('wish削除エラー:', error, '- userId:', req.session.userId, '- wishId:', req.params.id);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
