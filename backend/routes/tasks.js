const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// --- ヘルパー関数 ---

// 今日のタスクインスタンスを遅延生成（Daily/曜日タスク）
async function generateTodayInstances(userId) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  // ISO weekday: 1=月 ... 7=日
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

  const [templates] = await pool.execute(
    `SELECT * FROM task_templates
     WHERE user_id = ? AND is_active = TRUE
     AND task_type IN ('daily', 'weekday')
     AND trigger_time <= ?`,
    [userId, currentTime]
  );

  for (const tmpl of templates) {
    if (tmpl.task_type === 'weekday') {
      let weekdays = [];
      try {
        weekdays = typeof tmpl.weekdays === 'string' ? JSON.parse(tmpl.weekdays) : (tmpl.weekdays || []);
      } catch (e) {
        weekdays = [];
      }
      if (!weekdays.includes(dayOfWeek)) continue;
    }

    // UNIQUE(template_id, scheduled_date) で重複防止
    await pool.execute(
      `INSERT IGNORE INTO task_instances
       (template_id, user_id, title, description, task_type, scheduled_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tmpl.id, userId, tmpl.title, tmpl.description, tmpl.task_type, today]
    );
  }
}

const VALID_TASK_TYPES = ['normal', 'daily', 'weekday'];
const VALID_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

// --- バッジ用API（ヘッダーから高頻度で呼ばれる）---

// GET /api/tasks/badge - 今日の残タスク数
router.get('/badge', async (req, res) => {
  try {
    await generateTodayInstances(req.session.userId);
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as pending_count
       FROM task_instances
       WHERE user_id = ? AND scheduled_date = ? AND status = 'pending'`,
      [req.session.userId, today]
    );
    res.json({ pending_count: rows[0].pending_count });
  } catch (error) {
    console.error('[tasks] バッジ取得エラー:', error);
    res.status(500).json({ error: 'バッジ情報の取得に失敗しました' });
  }
});

// --- 今日のタスク ---

// GET /api/tasks/today - 今日のタスクインスタンス一覧
router.get('/today', async (req, res) => {
  try {
    await generateTodayInstances(req.session.userId);
    const today = new Date().toISOString().split('T')[0];
    const [instances] = await pool.execute(
      `SELECT ti.*, tt.trigger_time
       FROM task_instances ti
       LEFT JOIN task_templates tt ON ti.template_id = tt.id
       WHERE ti.user_id = ? AND ti.scheduled_date = ?
       ORDER BY ti.status ASC, tt.trigger_time ASC, ti.created_at ASC`,
      [req.session.userId, today]
    );
    res.json(instances);
  } catch (error) {
    console.error('[tasks] 今日のタスク取得エラー:', error);
    res.status(500).json({ error: '今日のタスクの取得に失敗しました' });
  }
});

// --- インスタンス操作 ---

// PUT /api/tasks/instances/:id/complete - タスク完了
router.put('/instances/:id/complete', async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE task_instances SET status = 'completed', completed_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [req.params.id, req.session.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'タスクが見つかりません' });
    }
    res.json({ message: 'タスクを完了しました' });
  } catch (error) {
    console.error('[tasks] タスク完了エラー:', error);
    res.status(500).json({ error: 'タスクの完了に失敗しました' });
  }
});

// PUT /api/tasks/instances/:id/skip - タスクスキップ
router.put('/instances/:id/skip', async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE task_instances SET status = 'skipped'
       WHERE id = ? AND user_id = ?`,
      [req.params.id, req.session.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'タスクが見つかりません' });
    }
    res.json({ message: 'タスクをスキップしました' });
  } catch (error) {
    console.error('[tasks] タスクスキップエラー:', error);
    res.status(500).json({ error: 'タスクのスキップに失敗しました' });
  }
});

// PUT /api/tasks/instances/:id/revert - タスクを未完了に戻す
router.put('/instances/:id/revert', async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE task_instances SET status = 'pending', completed_at = NULL
       WHERE id = ? AND user_id = ?`,
      [req.params.id, req.session.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'タスクが見つかりません' });
    }
    res.json({ message: 'タスクを未完了に戻しました' });
  } catch (error) {
    console.error('[tasks] タスク戻しエラー:', error);
    res.status(500).json({ error: 'タスクの状態変更に失敗しました' });
  }
});

// --- テンプレート管理 ---

// GET /api/tasks/templates - テンプレート一覧
router.get('/templates', async (req, res) => {
  try {
    const [templates] = await pool.execute(
      `SELECT * FROM task_templates
       WHERE user_id = ?
       ORDER BY task_type ASC, trigger_time ASC, created_at DESC`,
      [req.session.userId]
    );
    res.json(templates);
  } catch (error) {
    console.error('[tasks] テンプレート一覧取得エラー:', error);
    res.status(500).json({ error: 'テンプレートの取得に失敗しました' });
  }
});

// POST /api/tasks/templates - テンプレート作成
router.post('/templates', async (req, res) => {
  try {
    const { title, description, task_type, trigger_time, weekdays } = req.body;

    // バリデーション
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'タイトルは必須です' });
    }
    if (!VALID_TASK_TYPES.includes(task_type)) {
      return res.status(400).json({ error: '無効なタスクタイプです' });
    }
    if (task_type === 'weekday') {
      if (!Array.isArray(weekdays) || weekdays.length === 0) {
        return res.status(400).json({ error: '曜日タスクには曜日の指定が必要です' });
      }
      if (!weekdays.every(d => VALID_WEEKDAYS.includes(d))) {
        return res.status(400).json({ error: '無効な曜日が含まれています' });
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO task_templates (user_id, title, description, task_type, trigger_time, weekdays)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.session.userId,
        title.trim(),
        description ? description.trim() : null,
        task_type,
        (task_type === 'daily' || task_type === 'weekday') && trigger_time ? trigger_time : '09:00:00',
        task_type === 'weekday' ? JSON.stringify(weekdays) : null
      ]
    );

    const templateId = result.insertId;

    // 通常タスクの場合、即座にインスタンスを生成
    if (task_type === 'normal') {
      const today = new Date().toISOString().split('T')[0];
      await pool.execute(
        `INSERT INTO task_instances (template_id, user_id, title, description, task_type, scheduled_date)
         VALUES (?, ?, ?, ?, 'normal', ?)`,
        [templateId, req.session.userId, title.trim(), description ? description.trim() : null, today]
      );
    }

    const [created] = await pool.execute(
      'SELECT * FROM task_templates WHERE id = ?',
      [templateId]
    );

    res.status(201).json(created[0]);
  } catch (error) {
    console.error('[tasks] テンプレート作成エラー:', error);
    res.status(500).json({ error: 'テンプレートの作成に失敗しました' });
  }
});

// PUT /api/tasks/templates/:id - テンプレート更新
router.put('/templates/:id', async (req, res) => {
  try {
    const { title, description, task_type, trigger_time, weekdays, is_active } = req.body;

    if (title !== undefined && (!title || !title.trim())) {
      return res.status(400).json({ error: 'タイトルは必須です' });
    }
    if (task_type !== undefined && !VALID_TASK_TYPES.includes(task_type)) {
      return res.status(400).json({ error: '無効なタスクタイプです' });
    }

    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title.trim()); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description ? description.trim() : null); }
    if (task_type !== undefined) { updates.push('task_type = ?'); params.push(task_type); }
    if (trigger_time !== undefined) { updates.push('trigger_time = ?'); params.push(trigger_time); }
    if (weekdays !== undefined) { updates.push('weekdays = ?'); params.push(JSON.stringify(weekdays)); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    if (updates.length === 0) {
      return res.status(400).json({ error: '更新する項目がありません' });
    }

    params.push(req.params.id, req.session.userId);
    const [result] = await pool.execute(
      `UPDATE task_templates SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'テンプレートが見つかりません' });
    }

    const [updated] = await pool.execute(
      'SELECT * FROM task_templates WHERE id = ?',
      [req.params.id]
    );
    res.json(updated[0]);
  } catch (error) {
    console.error('[tasks] テンプレート更新エラー:', error);
    res.status(500).json({ error: 'テンプレートの更新に失敗しました' });
  }
});

// DELETE /api/tasks/templates/:id - テンプレート削除
router.delete('/templates/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM task_templates WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'テンプレートが見つかりません' });
    }
    res.json({ message: 'テンプレートを削除しました' });
  } catch (error) {
    console.error('[tasks] テンプレート削除エラー:', error);
    res.status(500).json({ error: 'テンプレートの削除に失敗しました' });
  }
});

module.exports = router;
