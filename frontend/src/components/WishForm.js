import React, { useState, useEffect } from 'react';
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
    }
  }, [wish]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'title' && error) {
      setError('');
    }
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
        onSave(data.wish);
      } else {
        setError(data.error || '保存に失敗しました');
      }
    } catch (err) {
      setError('接続エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="wish-form-container">
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

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存'}
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
