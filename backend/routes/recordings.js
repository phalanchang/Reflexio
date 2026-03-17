const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// 許可するMIMEタイプ
const ALLOWED_MIME_TYPES = ['audio/webm', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/mpeg'];

// ファイルサイズ上限（50MB）
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// 拡張子マッピング
const MIME_TO_EXT = {
  'audio/webm': 'webm',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3'
};

// multer の diskStorage 設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', String(req.session.userId), 'recordings');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] || 'bin';
    const uniqueName = `${crypto.randomUUID()}.${ext}`;
    cb(null, uniqueName);
  }
});

// multer インスタンス
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('許可されていないファイル形式です。WebM, WAV, OGG, MP4, MPEG のみアップロード可能です。'));
    }
    cb(null, true);
  }
});

// 全ルートに認証ミドルウェアを適用
router.use(requireAuth);

// POST / - 音声ファイルアップロード
router.post('/', (req, res) => {
  const uploadSingle = upload.single('audio');

  uploadSingle(req, res, async (err) => {
    // multer エラーハンドリング
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'ファイルサイズが50MBを超えています' });
        }
        return res.status(400).json({ error: `アップロードエラー: ${err.message}` });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: '音声ファイルが指定されていません' });
    }

    try {
      const userId = req.session.userId;
      const filePath = path.relative(path.join(__dirname, '..'), req.file.path);

      // voice_recordings テーブルに INSERT
      const [result] = await pool.execute(
        'INSERT INTO voice_recordings (user_id, file_path, file_size, mime_type) VALUES (?, ?, ?, ?)',
        [userId, filePath, req.file.size, req.file.mimetype]
      );

      // 挿入したレコードを取得
      const [rows] = await pool.execute(
        'SELECT id, file_path, file_size, mime_type, duration_seconds, created_at FROM voice_recordings WHERE id = ?',
        [result.insertId]
      );

      console.log(`[recordings] 音声アップロード成功: user_id=${userId}, recording_id=${result.insertId}, size=${req.file.size}`);

      res.status(201).json({
        message: '音声ファイルをアップロードしました',
        recording: rows[0]
      });
    } catch (error) {
      // エラー時にアップロード済みファイルを削除
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) { /* 無視 */ }
      }
      console.error('[recordings] 音声アップロードエラー:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// GET /:id - 録音メタ情報取得（関連 transcriptions 含む）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    // voice_recordings を取得
    const [recordings] = await pool.execute(
      'SELECT id, user_id, file_path, file_size, duration_seconds, mime_type, created_at FROM voice_recordings WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (recordings.length === 0) {
      return res.status(404).json({ error: '録音が見つかりません' });
    }

    // 関連する transcriptions を取得
    const [transcriptions] = await pool.execute(
      'SELECT id, raw_text, language, status, error_message, created_at, updated_at FROM transcriptions WHERE recording_id = ? AND user_id = ?',
      [id, userId]
    );

    res.json({
      recording: {
        ...recordings[0],
        transcriptions
      }
    });
  } catch (error) {
    console.error('[recordings] 録音取得エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - 録音削除（ファイル + DB）
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    // voice_recordings を取得（所有権チェック）
    const [recordings] = await pool.execute(
      'SELECT id, user_id, file_path FROM voice_recordings WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (recordings.length === 0) {
      return res.status(404).json({ error: '録音が見つかりません' });
    }

    const recording = recordings[0];

    // ファイルを物理削除（ファイルがなくてもエラーにしない）
    const filePath = path.join(__dirname, '..', recording.file_path);
    try { fs.unlinkSync(filePath); } catch (e) { /* ファイルがなくても無視 */ }

    // DB レコードを削除（CASCADE で transcriptions も削除）
    await pool.execute('DELETE FROM voice_recordings WHERE id = ?', [id]);

    console.log(`[recordings] 録音削除: user_id=${userId}, recording_id=${id}`);

    res.json({ message: '録音を削除しました' });
  } catch (error) {
    console.error('[recordings] 録音削除エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
