const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// 全ルートに認証ミドルウェアを適用
router.use(requireAuth);

// GET /api/knowledge/:knowledgeId/quizzes - クイズ一覧
router.get('/knowledge/:knowledgeId/quizzes', async (req, res) => {
  try {
    const { knowledgeId } = req.params;
    const userId = req.session.userId;

    // 知識アイテムの所有権チェック
    const [items] = await pool.execute(
      'SELECT id FROM knowledge_items WHERE id = ? AND user_id = ?',
      [knowledgeId, userId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: '知識アイテムが見つかりません' });
    }

    const [quizzes] = await pool.execute(
      `SELECT id, knowledge_item_id, question, answer, quiz_type, options_json, created_at, updated_at
       FROM quizzes WHERE knowledge_item_id = ? AND user_id = ?
       ORDER BY created_at ASC`,
      [knowledgeId, userId]
    );

    res.json({ quizzes });
  } catch (error) {
    console.error('[quizzes] 一覧取得エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/knowledge/:knowledgeId/quizzes - クイズ追加
router.post('/knowledge/:knowledgeId/quizzes', async (req, res) => {
  try {
    const { knowledgeId } = req.params;
    const userId = req.session.userId;
    const { question, answer, quiz_type, options_json } = req.body;

    // 知識アイテムの所有権チェック
    const [items] = await pool.execute(
      'SELECT id FROM knowledge_items WHERE id = ? AND user_id = ?',
      [knowledgeId, userId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: '知識アイテムが見つかりません' });
    }

    // 必須バリデーション
    if (!question || question.trim() === '') {
      return res.status(400).json({ error: '問題文は必須です' });
    }
    if (!answer || answer.trim() === '') {
      return res.status(400).json({ error: '回答は必須です' });
    }

    const quizType = quiz_type === 'multiple_choice' ? 'multiple_choice' : 'free_text';
    const optionsJsonStr = options_json ? JSON.stringify(options_json) : null;

    const [result] = await pool.execute(
      'INSERT INTO quizzes (knowledge_item_id, user_id, question, answer, quiz_type, options_json) VALUES (?, ?, ?, ?, ?, ?)',
      [knowledgeId, userId, question.trim(), answer.trim(), quizType, optionsJsonStr]
    );

    // 作成したレコードを取得
    const [rows] = await pool.execute(
      'SELECT id, knowledge_item_id, question, answer, quiz_type, options_json, created_at, updated_at FROM quizzes WHERE id = ?',
      [result.insertId]
    );

    console.log(`[quizzes] 作成: user_id=${userId}, knowledge_id=${knowledgeId}, quiz_id=${result.insertId}`);

    res.status(201).json({ message: 'クイズを作成しました', quiz: rows[0] });
  } catch (error) {
    console.error('[quizzes] 作成エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/quizzes/:id - クイズ更新
router.put('/quizzes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    const { question, answer, quiz_type, options_json } = req.body;

    // 必須バリデーション
    if (question !== undefined && (!question || question.trim() === '')) {
      return res.status(400).json({ error: '問題文は必須です' });
    }
    if (answer !== undefined && (!answer || answer.trim() === '')) {
      return res.status(400).json({ error: '回答は必須です' });
    }

    // 更新フィールドを動的に構築
    const updates = [];
    const params = [];

    if (question !== undefined) {
      updates.push('question = ?');
      params.push(question.trim());
    }
    if (answer !== undefined) {
      updates.push('answer = ?');
      params.push(answer.trim());
    }
    if (quiz_type !== undefined) {
      const quizType = quiz_type === 'multiple_choice' ? 'multiple_choice' : 'free_text';
      updates.push('quiz_type = ?');
      params.push(quizType);
    }
    if (options_json !== undefined) {
      updates.push('options_json = ?');
      params.push(options_json ? JSON.stringify(options_json) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '更新するフィールドがありません' });
    }

    params.push(id, userId);

    const [result] = await pool.execute(
      `UPDATE quizzes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'クイズが見つかりません' });
    }

    // 更新後のレコードを取得
    const [rows] = await pool.execute(
      'SELECT id, knowledge_item_id, question, answer, quiz_type, options_json, created_at, updated_at FROM quizzes WHERE id = ?',
      [id]
    );

    console.log(`[quizzes] 更新: user_id=${userId}, quiz_id=${id}`);

    res.json({ message: 'クイズを更新しました', quiz: rows[0] });
  } catch (error) {
    console.error('[quizzes] 更新エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/quizzes/:id - クイズ削除
router.delete('/quizzes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const [result] = await pool.execute(
      'DELETE FROM quizzes WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'クイズが見つかりません' });
    }

    console.log(`[quizzes] 削除: user_id=${userId}, quiz_id=${id}`);

    res.json({ message: 'クイズを削除しました' });
  } catch (error) {
    console.error('[quizzes] 削除エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
