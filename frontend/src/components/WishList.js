import React, { useState, useEffect, useCallback } from 'react';
import WishForm from './WishForm';
import WishFilter from './WishFilter';
import './WishList.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

const STATUS_MAP = {
  not_started: { label: '未着手', className: 'status-not-started' },
  in_progress: { label: '進行中', className: 'status-in-progress' },
  completed: { label: '完了', className: 'status-completed' }
};

const PRIORITY_MAP = {
  high: { label: '高', className: 'priority-high' },
  medium: { label: '中', className: 'priority-medium' },
  low: { label: '低', className: 'priority-low' }
};

function WishList() {
  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingWish, setEditingWish] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedPriorities, setSelectedPriorities] = useState([]);

  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  }, []);

  const fetchWishes = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/wishes`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setWishes(data.wishes);
      } else {
        showMessage('データの取得に失敗しました', 'error');
      }
    } catch (err) {
      showMessage('接続エラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/tags`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAllTags(data.tags);
      }
    } catch (err) { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchWishes();
    fetchTags();
  }, [fetchWishes, fetchTags]);

  const handleAdd = () => {
    setEditingWish(null);
    setShowForm(true);
  };

  const handleEdit = (wish) => {
    setEditingWish(wish);
    setShowForm(true);
  };

  const handleDelete = async (wish) => {
    if (!window.confirm(`「${wish.title}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/wishes/${wish.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setWishes(prev => prev.filter(w => w.id !== wish.id));
        showMessage('削除しました');
      } else {
        const data = await response.json();
        showMessage(data.error || '削除に失敗しました', 'error');
      }
    } catch (err) {
      showMessage('接続エラーが発生しました', 'error');
    }
  };

  const handleSave = (savedWish) => {
    if (editingWish) {
      setWishes(prev => prev.map(w => w.id === savedWish.id ? savedWish : w));
      showMessage('更新しました');
    } else {
      setWishes(prev => [savedWish, ...prev]);
      showMessage('追加しました');
    }
    setShowForm(false);
    setEditingWish(null);
    fetchTags();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingWish(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP');
  };

  // フィルタリング（クライアントサイド）
  const filteredWishes = wishes.filter(wish => {
    // タグフィルタ（OR: 選択タグのいずれかを持つ）
    if (selectedTags.length > 0) {
      const wishTagNames = (wish.tags || []).map(t => t.name);
      if (!selectedTags.some(tag => wishTagNames.includes(tag))) {
        return false;
      }
    }
    // 優先度フィルタ（OR: 選択優先度のいずれか）
    if (selectedPriorities.length > 0) {
      if (!selectedPriorities.includes(wish.priority)) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="wish-list-container">
        <div className="loading-message">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="wish-list-container">
      <div className="wish-list-header">
        <h2>やりたいこと</h2>
        {!showForm && (
          <button className="btn btn-primary" onClick={handleAdd}>
            ＋ 追加
          </button>
        )}
      </div>

      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <WishFilter
        tags={allTags}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        selectedPriorities={selectedPriorities}
        onPrioritiesChange={setSelectedPriorities}
        onReset={() => { setSelectedTags([]); setSelectedPriorities([]); }}
      />

      {showForm && (
        <WishForm
          wish={editingWish}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {wishes.length === 0 ? (
        <div className="empty-state">
          <p>まだ「やりたいこと」がありません。追加してみましょう！</p>
        </div>
      ) : filteredWishes.length === 0 ? (
        <div className="empty-state">
          <p>条件に一致する項目がありません</p>
        </div>
      ) : (
        <div className="wish-items">
          {filteredWishes.map(wish => (
            <div key={wish.id} className="wish-item">
              <div className="wish-item-main">
                <div className="wish-item-title">{wish.title}</div>
                <div className="wish-item-badges">
                  <span className={`badge ${STATUS_MAP[wish.status]?.className || ''}`}>
                    {STATUS_MAP[wish.status]?.label || wish.status}
                  </span>
                  <span className={`badge ${PRIORITY_MAP[wish.priority]?.className || ''}`}>
                    {PRIORITY_MAP[wish.priority]?.label || wish.priority}
                  </span>
                  {wish.due_date && (
                    <span className="wish-item-date">
                      期限: {formatDate(wish.due_date)}
                    </span>
                  )}
                </div>
              </div>
              {wish.tags && wish.tags.length > 0 && (
                <div className="wish-item-tags">
                  {wish.tags.map(tag => (
                    <span key={tag.id} className="tag-label">{tag.name}</span>
                  ))}
                </div>
              )}
              {wish.description && (
                <div className="wish-item-description">{wish.description}</div>
              )}
              <div className="wish-item-actions">
                <button className="btn-action btn-edit" onClick={() => handleEdit(wish)}>
                  編集
                </button>
                <button className="btn-action btn-delete" onClick={() => handleDelete(wish)}>
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WishList;
