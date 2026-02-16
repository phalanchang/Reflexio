import React, { useState, useEffect, useCallback } from 'react';
import WishForm from './WishForm';
import WishFilter from './WishFilter';
import ImageModal from './ImageModal';
import { useToast } from './Toast';
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
  const [showForm, setShowForm] = useState(false);
  const [editingWish, setEditingWish] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  const { showToast } = useToast();

  const fetchWishes = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/wishes`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setWishes(data.wishes);
      } else {
        showToast('データの取得に失敗しました', 'error');
      }
    } catch (err) {
      showToast('接続エラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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
        showToast('削除しました', 'success');
      } else {
        const data = await response.json();
        showToast(data.error || '削除に失敗しました', 'error');
      }
    } catch (err) {
      showToast('接続エラーが発生しました', 'error');
    }
  };

  const handleSave = (savedWish) => {
    if (editingWish) {
      showToast('更新しました', 'success');
    } else {
      showToast('追加しました', 'success');
    }
    setShowForm(false);
    setEditingWish(null);
    fetchTags();
    // 画像情報を含むデータを再取得
    fetchWishes();
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

  const openImageModal = (img) => {
    setModalImage(img);
  };

  const closeImageModal = () => {
    setModalImage(null);
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
            + 追加
          </button>
        )}
      </div>

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
              {wish.images && wish.images.length > 0 && (
                <div className="wish-item-images">
                  {wish.images.map(img => (
                    <img
                      key={img.id}
                      src={`${API_URL}/api/wishes/images/${img.id}`}
                      alt={img.original_name}
                      className="wish-item-thumbnail"
                      onClick={() => openImageModal(img)}
                    />
                  ))}
                </div>
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

      {modalImage && (
        <ImageModal image={modalImage} onClose={closeImageModal} />
      )}
    </div>
  );
}

export default WishList;
