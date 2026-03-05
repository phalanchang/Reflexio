import React, { useState, useEffect, useCallback, useRef } from 'react';
import WishForm from './WishForm';
import WishFilter from './WishFilter';
import ImageModal from './ImageModal';
import ActionMenu from './ActionMenu';
import useKeyboardShortcuts from './useKeyboardShortcuts';
import ShortcutHelp from './ShortcutHelp';
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

const PRIORITY_ORDER = { high: 3, medium: 2, low: 1 };

const getDueDateClass = (dateString) => {
  if (!dateString) return 'due-none';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dateString);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'due-overdue';       // 期限切れ: 赤太字
  if (diffDays === 0) return 'due-today';        // 今日: オレンジ太字
  if (diffDays <= 3) return 'due-soon';          // 3日以内: 黄色
  return 'due-future';                           // それ以降: グレー
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
  const [viewMode, setViewMode] = useState(localStorage.getItem('wishViewMode') || 'table');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOrder, setSortOrder] = useState(
    () => localStorage.getItem('wishSortOrder') || 'created_desc'
  );
  // 改善7: 一括操作
  const [selectedIds, setSelectedIds] = useState(new Set());
  // 改善8: キーボードショートカット
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
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

  // 検索デバウンス（300ms）
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ソート変更ハンドラ（localStorage永続化）
  const handleSortChange = (order) => {
    setSortOrder(order);
    localStorage.setItem('wishSortOrder', order);
  };

  // ソート比較関数
  const sortWishes = (wishList) => {
    return [...wishList].sort((a, b) => {
      switch (sortOrder) {
        case 'created_asc':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'created_desc':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'due_asc': {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;   // 期限なし → 末尾
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        }
        case 'due_desc': {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;   // 期限なし → 末尾
          if (!b.due_date) return -1;
          return new Date(b.due_date) - new Date(a.due_date);
        }
        case 'priority_desc':
          return (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
        case 'priority_asc':
          return (PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0);
        default:
          return 0;
      }
    });
  };

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

  // 改善6: ステータス変更
  const handleStatusChange = async (wishId, newStatus) => {
    try {
      const wish = wishes.find(w => w.id === wishId);
      if (!wish) return;

      const response = await fetch(`${API_URL}/api/wishes/${wishId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: wish.title,
          description: wish.description || '',
          status: newStatus,
          priority: wish.priority,
          due_date: wish.due_date || null,
          tags: (wish.tags || []).map(t => t.name)
        })
      });

      if (response.ok) {
        setWishes(prev => prev.map(w =>
          w.id === wishId ? { ...w, status: newStatus } : w
        ));
        showToast(`ステータスを「${STATUS_MAP[newStatus]?.label}」に変更しました`, 'success');
      } else {
        const data = await response.json();
        showToast(data.error || 'ステータス変更に失敗しました', 'error');
      }
    } catch (err) {
      showToast('接続エラーが発生しました', 'error');
    }
  };

  // 改善7: 一括ステータス変更
  const handleBulkStatusChange = async (newStatus) => {
    const ids = Array.from(selectedIds);
    try {
      const results = await Promise.all(
        ids.map(id => {
          const wish = wishes.find(w => w.id === id);
          if (!wish) return Promise.resolve({ ok: false });
          return fetch(`${API_URL}/api/wishes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              title: wish.title,
              description: wish.description || '',
              status: newStatus,
              priority: wish.priority,
              due_date: wish.due_date || null,
              tags: (wish.tags || []).map(t => t.name)
            })
          });
        })
      );
      const successCount = results.filter(r => r.ok).length;
      if (successCount > 0) {
        setWishes(prev => prev.map(w =>
          selectedIds.has(w.id) ? { ...w, status: newStatus } : w
        ));
        showToast(`${successCount}件のステータスを「${STATUS_MAP[newStatus]?.label}」に変更しました`, 'success');
      }
      if (successCount < ids.length) {
        showToast(`${ids.length - successCount}件の変更に失敗しました`, 'error');
      }
      setSelectedIds(new Set());
    } catch (err) {
      showToast('接続エラーが発生しました', 'error');
    }
  };

  // 改善7: 一括削除
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!window.confirm(`${ids.length}件のアイテムを削除してもよろしいですか？`)) {
      return;
    }
    try {
      const results = await Promise.all(
        ids.map(id =>
          fetch(`${API_URL}/api/wishes/${id}`, {
            method: 'DELETE',
            credentials: 'include'
          })
        )
      );
      const successCount = results.filter(r => r.ok).length;
      if (successCount > 0) {
        setWishes(prev => prev.filter(w => !selectedIds.has(w.id)));
        showToast(`${successCount}件を削除しました`, 'success');
      }
      if (successCount < ids.length) {
        showToast(`${ids.length - successCount}件の削除に失敗しました`, 'error');
      }
      setSelectedIds(new Set());
    } catch (err) {
      showToast('接続エラーが発生しました', 'error');
    }
  };

  // 改善7: チェックボックス操作
  const toggleSelectId = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredWishes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWishes.map(w => w.id)));
    }
  };

  // フィルタリング（クライアントサイド）
  const filteredWishes = sortWishes(
    wishes.filter(wish => {
      // ステータスフィルタ（OR）
      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(wish.status)) return false;
      }
      // テキスト検索（title + description 部分一致、大文字小文字区別なし）
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const titleMatch = (wish.title || '').toLowerCase().includes(query);
        const descMatch = (wish.description || '').toLowerCase().includes(query);
        if (!titleMatch && !descMatch) return false;
      }
      // タグフィルタ（OR: 選択タグのいずれかを持つ）
      if (selectedTags.length > 0) {
        const wishTagNames = (wish.tags || []).map(t => t.name);
        if (!selectedTags.some(tag => wishTagNames.includes(tag))) return false;
      }
      // 優先度フィルタ（OR: 選択優先度のいずれか）
      if (selectedPriorities.length > 0) {
        if (!selectedPriorities.includes(wish.priority)) return false;
      }
      return true;
    })
  );

  // フィルタ変更時に focusedIndex をクランプ
  useEffect(() => {
    setFocusedIndex(prev =>
      prev >= filteredWishes.length ? Math.max(filteredWishes.length - 1, -1) : prev
    );
  }, [filteredWishes.length]);

  // 改善8: キーボードショートカット
  useKeyboardShortcuts({
    onNewWish: () => { if (!showForm) handleAdd(); },
    onEditWish: () => {
      if (focusedIndex >= 0 && focusedIndex < filteredWishes.length) {
        handleEdit(filteredWishes[focusedIndex]);
      }
    },
    onDeleteWish: () => {
      if (selectedIds.size > 0) {
        handleBulkDelete();
      } else if (focusedIndex >= 0 && focusedIndex < filteredWishes.length) {
        handleDelete(filteredWishes[focusedIndex]);
      }
    },
    onFocusUp: () => {
      setFocusedIndex(prev => Math.max(0, prev - 1));
    },
    onFocusDown: () => {
      setFocusedIndex(prev => Math.min(filteredWishes.length - 1, prev + 1));
    },
    onToggleCheckbox: () => {
      if (focusedIndex >= 0 && focusedIndex < filteredWishes.length) {
        toggleSelectId(filteredWishes[focusedIndex].id);
      }
    },
    onSearchFocus: () => {
      const input = document.querySelector('.filter-search-input');
      if (input) input.focus();
    },
    onEscape: () => {
      if (showShortcutHelp) {
        setShowShortcutHelp(false);
      } else if (showForm) {
        handleCancel();
      } else if (modalImage) {
        closeImageModal();
      }
    },
    onShowHelp: () => setShowShortcutHelp(true),
    isDisabled: showForm || !!modalImage || showShortcutHelp,
    isTableView: viewMode === 'table',
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
        <div className="wish-list-header-actions">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => { setViewMode('table'); localStorage.setItem('wishViewMode', 'table'); }}
              title="テーブル表示"
            >☰</button>
            <button
              className={`view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => { setViewMode('card'); localStorage.setItem('wishViewMode', 'card'); }}
              title="カード表示"
            >▦</button>
          </div>
          {!showForm && (
            <button className="btn btn-primary" onClick={handleAdd}>
              + 追加
            </button>
          )}
        </div>
      </div>

      {/* サマリーバー — wishesはフィルタ前の全件で集計 */}
      <div className="summary-bar">
        <button
          className={`summary-badge ${selectedStatuses.length === 0 ? 'summary-badge-active' : ''}`}
          onClick={() => setSelectedStatuses([])}
        >
          全て {wishes.length}
        </button>
        {Object.entries(STATUS_MAP).map(([key, { label }]) => {
          const count = wishes.filter(w => w.status === key).length;
          return (
            <button
              key={key}
              className={`summary-badge summary-badge-${key} ${selectedStatuses.includes(key) ? 'summary-badge-active' : ''}`}
              onClick={() => {
                setSelectedStatuses(prev =>
                  prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
                );
              }}
            >
              {label} {count}
            </button>
          );
        })}
      </div>

      <WishFilter
        tags={allTags}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        selectedPriorities={selectedPriorities}
        onPrioritiesChange={setSelectedPriorities}
        onReset={() => {
          setSelectedTags([]);
          setSelectedPriorities([]);
          setSearchQuery('');
          // ソートはリセットしない（ユーザー設定として保持）
          // ステータスフィルタもリセット
          setSelectedStatuses([]);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
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
      ) : viewMode === 'table' ? (
        <>
        <table className="wish-table">
          <thead>
            <tr>
              <th className="wish-table-checkbox">
                <input
                  type="checkbox"
                  checked={filteredWishes.length > 0 && selectedIds.size === filteredWishes.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>タイトル</th>
              <th>ステータス</th>
              <th>優先度</th>
              <th>タグ</th>
              <th>期限</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredWishes.map((wish, index) => (
              <tr
                key={wish.id}
                className={`${index % 2 === 1 ? 'even-row' : ''} ${focusedIndex === index ? 'focused-row' : ''} ${selectedIds.has(wish.id) ? 'selected-row' : ''}`}
                onClick={() => setFocusedIndex(index)}
              >
                <td className="wish-table-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(wish.id)}
                    onChange={() => toggleSelectId(wish.id)}
                  />
                </td>
                <td className="wish-table-title">
                  {wish.images && wish.images.length > 0 && <span className="has-image-icon">📷</span>}
                  {wish.title}
                </td>
                <td><span className={`badge-sm ${STATUS_MAP[wish.status]?.className || ''}`}>{STATUS_MAP[wish.status]?.label || wish.status}</span></td>
                <td><span className={`badge-sm ${PRIORITY_MAP[wish.priority]?.className || ''}`}>{PRIORITY_MAP[wish.priority]?.label || wish.priority}</span></td>
                <td className="wish-table-tags">
                  {(wish.tags || []).slice(0, 3).map(tag => (
                    <span key={tag.id} className="tag-label-sm">{tag.name}</span>
                  ))}
                  {(wish.tags || []).length > 3 && <span className="tag-more">+{wish.tags.length - 3}</span>}
                </td>
                <td className={getDueDateClass(wish.due_date)}>
                  {wish.due_date ? formatDate(wish.due_date) : <span className="no-due-date">-</span>}
                </td>
                <td className="wish-table-actions">
                  <ActionMenu
                    wish={wish}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* フローティングアクションバー */}
        {viewMode === 'table' && selectedIds.size > 0 && (
          <div className="bulk-action-bar">
            <span className="bulk-action-count">{selectedIds.size}件選択中</span>
            <div className="bulk-action-buttons">
              <div className="bulk-action-status">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkStatusChange(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>ステータス変更</option>
                  <option value="not_started">未着手</option>
                  <option value="in_progress">進行中</option>
                  <option value="completed">完了</option>
                </select>
              </div>
              <button className="bulk-action-delete" onClick={handleBulkDelete}>
                一括削除
              </button>
            </div>
            <button className="bulk-action-clear" onClick={() => setSelectedIds(new Set())}>
              ✕
            </button>
          </div>
        )}
        </>
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
                    <span className={`wish-item-date ${getDueDateClass(wish.due_date)}`}>
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
                <ActionMenu
                  wish={wish}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {modalImage && (
        <ImageModal image={modalImage} onClose={closeImageModal} />
      )}

      <ShortcutHelp
        isOpen={showShortcutHelp}
        onClose={() => setShowShortcutHelp(false)}
      />
    </div>
  );
}

export default WishList;
