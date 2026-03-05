import React, { useState, useEffect, useRef } from 'react';
import TagInput from './TagInput';
import './WishForm.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

function WishForm({ wish, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    status: 'not_started',
    priority: 'medium',
    due_date: '',
    description: '',
    tags: []
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState([]);
  // pendingFiles: { file: File, previewUrl: string }[]
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);

  const isEditMode = !!wish;

  useEffect(() => {
    if (wish) {
      setFormData({
        title: wish.title || '',
        status: wish.status || 'not_started',
        priority: wish.priority || 'medium',
        due_date: wish.due_date ? wish.due_date.split('T')[0] : '',
        description: wish.description || '',
        tags: wish.tags ? wish.tags.map(t => t.name) : []
      });
      if (wish.images) {
        setImages(wish.images);
      }
    }
  }, [wish]);

  // Blob URL クリーンアップ: アンマウント時に全 previewUrl を解放
  useEffect(() => {
    return () => {
      pendingFiles.forEach(pf => URL.revokeObjectURL(pf.previewUrl));
    };
  }, [pendingFiles]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'title' && error) {
      setError('');
    }
  };

  // pendingFiles に追加する共通関数（previewUrl を一度だけ生成）
  const addPendingFile = (file) => {
    const previewUrl = URL.createObjectURL(file);
    setPendingFiles(prev => [...prev, { file, previewUrl }]);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file.size > 5 * 1024 * 1024) {
          setImageError('画像サイズは5MB以下にしてください');
          return;
        }
        if (images.length + pendingFiles.length >= 5) {
          setImageError('画像は最大5枚までです');
          return;
        }
        addPendingFile(file);
        setImageError('');
        break;
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('画像ファイルを選択してください');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('画像サイズは5MB以下にしてください');
      return;
    }
    if (images.length + pendingFiles.length >= 5) {
      setImageError('画像は最大5枚までです');
      return;
    }
    addPendingFile(file);
    setImageError('');
    // reset input value so the same file can be selected again
    e.target.value = '';
  };

  const removeExistingImage = async (imageId) => {
    try {
      const response = await fetch(`${API_URL}/api/wishes/images/${imageId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setImages(prev => prev.filter(img => img.id !== imageId));
      } else {
        setImageError('画像の削除に失敗しました');
      }
    } catch (err) {
      setImageError('接続エラーが発生しました');
    }
  };

  const removePendingFile = (index) => {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    setImageError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('タイトルは必須です');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditMode
        ? `${API_URL}/api/wishes/${wish.id}`
        : `${API_URL}/api/wishes`;
      const method = isEditMode ? 'PUT' : 'POST';

      const body = {
        title: formData.title.trim(),
        status: formData.status,
        priority: formData.priority,
        description: formData.description.trim() || null,
        due_date: formData.due_date || null,
        tags: formData.tags
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        const savedWish = data.wish;
        const wishId = savedWish.id;

        // 新規画像があればアップロード
        if (pendingFiles.length > 0) {
          setUploading(true);
          const uploadErrors = [];
          for (const pf of pendingFiles) {
            const uploadFormData = new FormData();
            uploadFormData.append('image', pf.file);
            try {
              const uploadRes = await fetch(`${API_URL}/api/wishes/${wishId}/images`, {
                method: 'POST',
                credentials: 'include',
                body: uploadFormData
              });
              if (!uploadRes.ok) {
                const errData = await uploadRes.json();
                uploadErrors.push(errData.error || `${pf.file.name} のアップロードに失敗しました`);
              }
            } catch (err) {
              uploadErrors.push(`${pf.file.name} のアップロードに失敗しました`);
            }
          }
          // Blob URL を解放してから pendingFiles をクリア
          pendingFiles.forEach(pf => URL.revokeObjectURL(pf.previewUrl));
          setPendingFiles([]);
          setUploading(false);

          if (uploadErrors.length > 0) {
            setImageError(uploadErrors.join(', '));
          }
        }

        // wish 自体は保存済みなので onSave は常に呼ぶ
        onSave(savedWish);
      } else {
        setError(data.error || '保存に失敗しました');
      }
    } catch (err) {
      setError('接続エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
      setUploading(false);
    }
  };

  const totalImages = images.length + pendingFiles.length;

  return (
    <div className="wish-form-container" onPaste={handlePaste}>
      <h3 className="wish-form-title">
        {isEditMode ? 'やりたいことを編集' : 'やりたいことを追加'}
      </h3>
      <form onSubmit={handleSubmit} className="wish-form">
        <div className="form-group">
          <label htmlFor="wish-title">タイトル <span className="required">*</span></label>
          <input
            id="wish-title"
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="やりたいことを入力"
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="wish-status">ステータス</label>
            <select
              id="wish-status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="not_started">未着手</option>
              <option value="in_progress">進行中</option>
              <option value="completed">完了</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="wish-priority">優先度</label>
            <select
              id="wish-priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="wish-due-date">期限</label>
          <input
            id="wish-due-date"
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label>タグ</label>
          <TagInput
            tags={formData.tags}
            onChange={(newTags) => setFormData(prev => ({ ...prev, tags: newTags }))}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="wish-description">メモ</label>
          <textarea
            id="wish-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="メモを入力（任意）"
            rows="3"
            disabled={isSubmitting}
          />
        </div>

        {/* 画像プレビューセクション */}
        <div className="image-preview-section">
          <label className="image-preview-label">
            画像 ({totalImages}/5)
          </label>
          <div className="image-preview-grid">
            {/* 既存画像 */}
            {images.map(img => (
              <div key={`existing-${img.id}`} className="image-preview-item">
                <img
                  src={`${API_URL}/api/wishes/images/${img.id}`}
                  alt={img.original_name || 'image'}
                />
                <button
                  type="button"
                  className="image-remove-btn"
                  onClick={() => removeExistingImage(img.id)}
                  disabled={isSubmitting}
                >
                  &times;
                </button>
              </div>
            ))}
            {/* 新規画像（プレビュー） */}
            {pendingFiles.map((pf, index) => (
              <div key={`pending-${index}`} className="image-preview-item">
                <img
                  src={pf.previewUrl}
                  alt={pf.file.name}
                />
                <button
                  type="button"
                  className="image-remove-btn"
                  onClick={() => removePendingFile(index)}
                  disabled={isSubmitting}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          {totalImages < 5 && (
            <div className="image-add-area">
              <button
                type="button"
                className="image-add-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
              >
                + 画像を追加
              </button>
              <span className="image-paste-hint">Ctrl+V で画像を貼り付け</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          )}
          {imageError && <div className="image-error">{imageError}</div>}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || uploading}>
            {uploading ? '画像アップロード中...' : isSubmitting ? '保存中...' : '保存'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSubmitting}>
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}

export default WishForm;
