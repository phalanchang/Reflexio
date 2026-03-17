const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// ENUM値のホワイトリスト
const VALID_DIFFICULTY = ['easy', 'medium', 'hard'];

// 全ルートに認証ミドルウェアを適用
router.use(requireAuth);

// GET /api/knowledge/stats - 統計情報
// 注意: /api/knowledge/:id より先に定義すること（Express ルート優先度）
router.get('/stats', async (req, res) => {
  try {
    const userId = req.session.userId;

    const [totalRows] = await pool.execute(
      'SELECT COUNT(*) as total_items FROM knowledge_items WHERE user_id = ?',
      [userId]
    );

    const [dueRows] = await pool.execute(
      'SELECT COUNT(*) as due_today FROM knowledge_items WHERE user_id = ? AND (next_review_date <= CURDATE() OR next_review_date IS NULL)',
      [userId]
    );

    const [masteredRows] = await pool.execute(
      'SELECT COUNT(*) as mastered FROM knowledge_items WHERE user_id = ? AND retention_score >= 80 AND interval_days >= 30',
      [userId]
    );

    const [learningRows] = await pool.execute(
      'SELECT COUNT(*) as learning FROM knowledge_items WHERE user_id = ? AND repetitions > 0 AND NOT (retention_score >= 80 AND interval_days >= 30)',
      [userId]
    );

    const [notStartedRows] = await pool.execute(
      'SELECT COUNT(*) as not_started FROM knowledge_items WHERE user_id = ? AND next_review_date IS NULL',
      [userId]
    );

    const [retentionRows] = await pool.execute(
      'SELECT AVG(retention_score) as retention_avg FROM knowledge_items WHERE user_id = ?',
      [userId]
    );

    res.json({
      stats: {
        total_items: totalRows[0].total_items,
        due_today: dueRows[0].due_today,
        mastered: masteredRows[0].mastered,
        learning: learningRows[0].learning,
        not_started: notStartedRows[0].not_started,
        retention_avg: retentionRows[0].retention_avg !== null ? parseFloat(retentionRows[0].retention_avg) : 0
      }
    });
  } catch (error) {
    console.error('[knowledge] 統計取得エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/knowledge - 一覧取得（フィルタ対応）
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { category, difficulty, status } = req.query;

    let whereConditions = ['ki.user_id = ?'];
    let params = [userId];

    if (category) {
      whereConditions.push('ki.category = ?');
      params.push(category);
    }

    if (difficulty && VALID_DIFFICULTY.includes(difficulty)) {
      whereConditions.push('ki.difficulty = ?');
      params.push(difficulty);
    }

    if (status === 'due') {
      whereConditions.push('(ki.next_review_date <= CURDATE() OR ki.next_review_date IS NULL)');
    } else if (status === 'mastered') {
      whereConditions.push('ki.retention_score >= 80 AND ki.interval_days >= 30');
    } else if (status === 'not_started') {
      whereConditions.push('ki.next_review_date IS NULL');
    }

    const whereClause = whereConditions.join(' AND ');

    const [items] = await pool.execute(
      `SELECT ki.id, ki.user_id, ki.title, ki.content, ki.category, ki.difficulty,
              ki.easiness_factor, ki.repetitions, ki.interval_days, ki.next_review_date,
              ki.retention_score, ki.created_at, ki.updated_at,
              COALESCE(qc.quiz_count, 0) as quiz_count
       FROM knowledge_items ki
       LEFT JOIN (
         SELECT knowledge_item_id, COUNT(*) as quiz_count
         FROM quizzes
         GROUP BY knowledge_item_id
       ) qc ON ki.id = qc.knowledge_item_id
       WHERE ${whereClause}
       ORDER BY ki.created_at DESC`,
      params
    );

    res.json({ knowledge_items: items });
  } catch (error) {
    console.error('[knowledge] 一覧取得エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/knowledge/:id - 詳細取得（クイズ一覧含む）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const [items] = await pool.execute(
      `SELECT id, user_id, title, content, category, difficulty,
              easiness_factor, repetitions, interval_days, next_review_date,
              retention_score, created_at, updated_at
       FROM knowledge_items WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: '知識アイテムが見つかりません' });
    }

    const item = items[0];

    // クイズ一覧を取得
    const [quizzes] = await pool.execute(
      `SELECT id, knowledge_item_id, question, answer, quiz_type, options_json, created_at, updated_at
       FROM quizzes WHERE knowledge_item_id = ? AND user_id = ?`,
      [id, userId]
    );

    item.quizzes = quizzes;

    res.json({ knowledge_item: item });
  } catch (error) {
    console.error('[knowledge] 詳細取得エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/knowledge - 新規作成（クイズ同時作成対応、トランザクション）
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.session.userId;
    const { title, content, category, difficulty, quizzes } = req.body;

    // タイトル必須バリデーション
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'タイトルは必須です' });
    }

    // content必須バリデーション
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '内容は必須です' });
    }

    // difficulty バリデーション
    const itemDifficulty = difficulty && VALID_DIFFICULTY.includes(difficulty) ? difficulty : 'medium';

    await connection.beginTransaction();

    // 知識アイテム INSERT
    const [result] = await connection.execute(
      'INSERT INTO knowledge_items (user_id, title, content, category, difficulty) VALUES (?, ?, ?, ?, ?)',
      [userId, title.trim(), content.trim(), category || null, itemDifficulty]
    );

    const knowledgeItemId = result.insertId;

    // クイズ同時作成
    if (quizzes && Array.isArray(quizzes) && quizzes.length > 0) {
      for (const quiz of quizzes) {
        if (!quiz.question || !quiz.question.trim() || !quiz.answer || !quiz.answer.trim()) {
          continue; // 不正なクイズはスキップ
        }

        const quizType = quiz.quiz_type === 'multiple_choice' ? 'multiple_choice' : 'free_text';
        const optionsJson = quiz.options_json ? JSON.stringify(quiz.options_json) : null;

        await connection.execute(
          'INSERT INTO quizzes (knowledge_item_id, user_id, question, answer, quiz_type, options_json) VALUES (?, ?, ?, ?, ?, ?)',
          [knowledgeItemId, userId, quiz.question.trim(), quiz.answer.trim(), quizType, optionsJson]
        );
      }
    }

    await connection.commit();

    // 作成したレコードを取得
    const [items] = await pool.execute(
      `SELECT id, user_id, title, content, category, difficulty,
              easiness_factor, repetitions, interval_days, next_review_date,
              retention_score, created_at, updated_at
       FROM knowledge_items WHERE id = ?`,
      [knowledgeItemId]
    );

    const [createdQuizzes] = await pool.execute(
      'SELECT id, knowledge_item_id, question, answer, quiz_type, options_json, created_at, updated_at FROM quizzes WHERE knowledge_item_id = ?',
      [knowledgeItemId]
    );

    const createdItem = items[0];
    createdItem.quizzes = createdQuizzes;

    console.log(`[knowledge] 作成: user_id=${userId}, id=${knowledgeItemId}, title="${title}", quizzes=${createdQuizzes.length}件`);

    res.status(201).json({ message: '知識アイテムを作成しました', knowledge_item: createdItem });
  } catch (error) {
    await connection.rollback();
    console.error('[knowledge] 作成エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// PUT /api/knowledge/:id - 更新
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    const { title, content, category, difficulty } = req.body;

    // タイトル必須バリデーション
    if (title !== undefined && (!title || title.trim() === '')) {
      return res.status(400).json({ error: 'タイトルは必須です' });
    }

    // difficulty バリデーション
    if (difficulty !== undefined && !VALID_DIFFICULTY.includes(difficulty)) {
      return res.status(400).json({ error: '無効な難易度です' });
    }

    // 更新フィールドを動的に構築
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title.trim());
    }
    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content.trim());
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category || null);
    }
    if (difficulty !== undefined) {
      updates.push('difficulty = ?');
      params.push(difficulty);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '更新するフィールドがありません' });
    }

    params.push(id, userId);

    const [result] = await pool.execute(
      `UPDATE knowledge_items SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '知識アイテムが見つかりません' });
    }

    // 更新後のレコードを取得
    const [items] = await pool.execute(
      `SELECT id, user_id, title, content, category, difficulty,
              easiness_factor, repetitions, interval_days, next_review_date,
              retention_score, created_at, updated_at
       FROM knowledge_items WHERE id = ?`,
      [id]
    );

    console.log(`[knowledge] 更新: user_id=${userId}, id=${id}`);

    res.json({ message: '知識アイテムを更新しました', knowledge_item: items[0] });
  } catch (error) {
    console.error('[knowledge] 更新エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/knowledge/:id - 削除（CASCADE でクイズも自動削除）
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const [result] = await pool.execute(
      'DELETE FROM knowledge_items WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '知識アイテムが見つかりません' });
    }

    console.log(`[knowledge] 削除: user_id=${userId}, id=${id}`);

    res.json({ message: '知識アイテムを削除しました' });
  } catch (error) {
    console.error('[knowledge] 削除エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
