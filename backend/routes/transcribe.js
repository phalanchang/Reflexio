const express = require('express');
const router = express.Router();
const { execFile } = require('child_process');
const path = require('path');
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// Python パス（Docker: python3、WSLホスト: PYTHON_PATH環境変数で指定）
const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'transcribe.py');

// 全ルートに認証ミドルウェアを適用
router.use(requireAuth);

// POST /transcribe - 文字起こし実行
router.post('/transcribe', async (req, res) => {
  try {
    const { recording_id } = req.body;
    const userId = req.session.userId;

    if (!recording_id) {
      return res.status(400).json({ error: 'recording_id は必須です' });
    }

    // recording_id から voice_recordings を取得（所有権チェック）
    const [recordings] = await pool.execute(
      'SELECT id, user_id, file_path FROM voice_recordings WHERE id = ? AND user_id = ?',
      [recording_id, userId]
    );

    if (recordings.length === 0) {
      return res.status(404).json({ error: '録音が見つかりません' });
    }

    const recording = recordings[0];
    const audioFilePath = path.join(__dirname, '..', recording.file_path);

    // transcriptions テーブルに 'processing' で INSERT
    const [insertResult] = await pool.execute(
      'INSERT INTO transcriptions (recording_id, user_id, status) VALUES (?, ?, ?)',
      [recording_id, userId, 'processing']
    );
    const transcriptionId = insertResult.insertId;

    console.log(`[transcribe] 文字起こし開始: user_id=${userId}, recording_id=${recording_id}, transcription_id=${transcriptionId}`);

    // 子プロセスで Python スクリプトを実行（タイムアウト: 5分）
    execFile(PYTHON_PATH, [SCRIPT_PATH, audioFilePath], { timeout: 300000 }, async (error, stdout, stderr) => {
      try {
        // クライアント切断時のレスポンス二重送信防止
        if (res.headersSent) return;

        if (error) {
          // 失敗: error_message を UPDATE、status: 'failed'
          const errorMsg = stderr || error.message || '不明なエラーが発生しました';
          await pool.execute(
            'UPDATE transcriptions SET status = ?, error_message = ? WHERE id = ?',
            ['failed', errorMsg, transcriptionId]
          );

          console.error(`[transcribe] 文字起こし失敗: transcription_id=${transcriptionId}, error=${errorMsg}`);

          // 挿入したレコードを取得して返却
          const [rows] = await pool.execute(
            'SELECT id, recording_id, raw_text, language, status, error_message, created_at, updated_at FROM transcriptions WHERE id = ?',
            [transcriptionId]
          );

          return res.status(500).json({
            message: '文字起こしに失敗しました',
            transcription: rows[0]
          });
        }

        // 成功: Python の出力をパース
        let result;
        try {
          result = JSON.parse(stdout);
        } catch (parseError) {
          await pool.execute(
            'UPDATE transcriptions SET status = ?, error_message = ? WHERE id = ?',
            ['failed', `出力のパースに失敗しました: ${stdout}`, transcriptionId]
          );

          const [rows] = await pool.execute(
            'SELECT id, recording_id, raw_text, language, status, error_message, created_at, updated_at FROM transcriptions WHERE id = ?',
            [transcriptionId]
          );

          return res.status(500).json({
            message: '文字起こし結果のパースに失敗しました',
            transcription: rows[0]
          });
        }

        // 成功: raw_text, language を UPDATE、status: 'completed'
        await pool.execute(
          'UPDATE transcriptions SET raw_text = ?, language = ?, status = ? WHERE id = ?',
          [result.text, result.language, 'completed', transcriptionId]
        );

        // duration_seconds を voice_recordings に更新
        if (result.duration) {
          await pool.execute(
            'UPDATE voice_recordings SET duration_seconds = ? WHERE id = ?',
            [result.duration, recording_id]
          );
        }

        console.log(`[transcribe] 文字起こし成功: transcription_id=${transcriptionId}, language=${result.language}, text_length=${result.text ? result.text.length : 0}`);

        // 更新後のレコードを取得して返却
        const [rows] = await pool.execute(
          'SELECT id, recording_id, raw_text, language, status, error_message, created_at, updated_at FROM transcriptions WHERE id = ?',
          [transcriptionId]
        );

        res.json({
          message: '文字起こしが完了しました',
          transcription: rows[0]
        });
      } catch (dbError) {
        console.error('[transcribe] DB更新エラー:', dbError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });
  } catch (error) {
    console.error('[transcribe] 文字起こしエラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /transcriptions/:id - 文字起こし結果取得
router.get('/transcriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const [transcriptions] = await pool.execute(
      'SELECT id, recording_id, raw_text, language, status, error_message, created_at, updated_at FROM transcriptions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (transcriptions.length === 0) {
      return res.status(404).json({ error: '文字起こしが見つかりません' });
    }

    res.json({
      transcription: transcriptions[0]
    });
  } catch (error) {
    console.error('[transcribe] 文字起こし取得エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
