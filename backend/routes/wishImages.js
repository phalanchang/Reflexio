const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// 許可するMIMEタイプ
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// 最大画像枚数
const MAX_IMAGES_PER_WISH = 5;

// ファイルサイズ上限（5MB）
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 拡張子マッピング
const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp'
};

// multer の diskStorage 設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', String(req.session.userId));
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] || 'bin';
    const uniqueName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    cb(null, uniqueName);
  }
});

// multer インスタンス
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('許可されていないファイル形式です。JPEG, PNG, GIF, WebP のみアップロード可能です。'));
    }
    cb(null, true);
  }
});

// 全ルートに認証ミドルウェアを適用
router.use(requireAuth);

// POST /:wishId/images - 画像アップロード
router.post('/:wishId/images', (req, res) => {
  const uploadSingle = upload.single('image');

  uploadSingle(req, res, async (err) => {
    // multer エラーハンドリング
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'ファイルサイズが5MBを超えています' });
        }
        return res.status(400).json({ error: `アップロードエラー: ${err.message}` });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: '画像ファイルが指定されていません' });
    }

    try {
      const { wishId } = req.params;
      const userId = req.session.userId;

      // wish の存在確認と所有権チェック
      const [wishes] = await pool.execute(
        'SELECT id FROM wishes WHERE id = ? AND user_id = ?',
        [wishId, userId]
      );

      if (wishes.length === 0) {
        // アップロード済みファイルを削除
        try { fs.unlinkSync(req.file.path); } catch (e) { /* 無視 */ }
        return res.status(404).json({ error: '対象のやりたいことが見つかりません' });
      }

      // 画像枚数チェック
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) as count FROM wish_images WHERE wish_id = ?',
        [wishId]
      );

      if (countResult[0].count >= MAX_IMAGES_PER_WISH) {
        // アップロード済みファイルを削除
        try { fs.unlinkSync(req.file.path); } catch (e) { /* 無視 */ }
        return res.status(400).json({ error: `画像は最大${MAX_IMAGES_PER_WISH}枚までです` });
      }

      // DB に画像レコードを INSERT
      const [result] = await pool.execute(
        'INSERT INTO wish_images (wish_id, user_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)',
        [wishId, userId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
      );

      // 挿入したレコードを取得
      const [rows] = await pool.execute(
        'SELECT id, wish_id, filename, original_name, mime_type, size, created_at FROM wish_images WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        message: '画像をアップロードしました',
        image: rows[0]
      });
    } catch (error) {
      // エラー時にアップロード済みファイルを削除
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) { /* 無視 */ }
      }
      console.error('画像アップロードエラー:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// GET /images/:imageId - 画像配信（認証付き）
router.get('/images/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const userId = req.session.userId;

    // DB から画像レコード取得
    const [images] = await pool.execute(
      'SELECT id, wish_id, user_id, filename, mime_type FROM wish_images WHERE id = ?',
      [imageId]
    );

    if (images.length === 0) {
      return res.status(404).json({ error: '画像が見つかりません' });
    }

    const image = images[0];

    // 所有権チェック
    if (image.user_id !== userId) {
      return res.status(403).json({ error: 'この画像にアクセスする権限がありません' });
    }

    // ファイルパス構築
    const filePath = path.join(__dirname, '..', 'uploads', String(image.user_id), image.filename);

    // ファイル存在確認
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '画像ファイルが見つかりません' });
    }

    // Content-Type を設定して配信
    res.setHeader('Content-Type', image.mime_type);
    res.sendFile(filePath);
  } catch (error) {
    console.error('画像配信エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /images/:imageId - 画像削除
router.delete('/images/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const userId = req.session.userId;

    // DB から画像レコード取得
    const [images] = await pool.execute(
      'SELECT id, wish_id, user_id, filename FROM wish_images WHERE id = ?',
      [imageId]
    );

    if (images.length === 0) {
      return res.status(404).json({ error: '画像が見つかりません' });
    }

    const image = images[0];

    // 所有権チェック
    if (image.user_id !== userId) {
      return res.status(403).json({ error: 'この画像を削除する権限がありません' });
    }

    // ファイルを物理削除（ファイルがなくてもエラーにしない）
    const filePath = path.join(__dirname, '..', 'uploads', String(image.user_id), image.filename);
    try { fs.unlinkSync(filePath); } catch (e) { /* ファイルがなくても無視 */ }

    // DB レコードを削除
    await pool.execute('DELETE FROM wish_images WHERE id = ?', [imageId]);

    res.json({ message: '画像を削除しました' });
  } catch (error) {
    console.error('画像削除エラー:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
