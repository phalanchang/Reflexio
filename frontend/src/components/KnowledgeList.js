import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';
import './KnowledgeList.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

const DIFFICULTY_MAP = {
  easy: { label: 'Easy', className: 'difficulty-easy' },
  medium: { label: 'Medium', className: 'difficulty-medium' },
  hard: { label: 'Hard', className: 'difficulty-hard' }
};

const REVIEW_FILTERS = [
  { value: 'all', label: '全て' },
  { value: 'due', label: '今日復習' },
  { value: 'mastered', label: '復習不要' },
  { value: 'not_started', label: '未学習' }
];

const DIFFICULTY_FILTERS = [
  { value: '', label: '全難易度' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

function KnowledgeList() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total_items: 0, due_today: 0, mastered: 0, learning: 0, not_started: 0 });
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [reviewFilter, setReviewFilter] = useState('all');

  const fetchKnowledge = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      if (difficultyFilter) params.set('difficulty', difficultyFilter);
      if (reviewFilter !== 'all') params.set('status', reviewFilter);

      const qs = params.toString();
      const url = `${API_URL}/api/knowledge${qs ? `?${qs}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });

      if (response.ok) {
        const data = await response.json();
        setItems(data.knowledge_items || []);
      } else {
        showToast('知識データの取得に失敗しました', 'error');
      }
    } catch (err) {
      showToast('接続エラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, difficultyFilter, reviewFilter, showToast]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/knowledge/stats`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchKnowledge();
    fetchStats();
  }, [fetchKnowledge, fetchStats]);

  const getNextReviewClass = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const reviewDate = new Date(dateString);
    reviewDate.setHours(0, 0, 0, 0);
    if (reviewDate <= now) return 'review-overdue';
    return '';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="loading-message">読み込み中...</div>;
  }

  return (
    <div className="knowledge-list-container">
      <div className="knowledge-list-header">
        <h2>学習管理</h2>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/knowledge/new')}
        >
          + 新規追加
        </button>
      </div>

      {/* 統計サマリーバー */}
      <div className="knowledge-summary-bar">
        <span className="knowledge-summary-badge summary-all">
          全体 <strong>{stats.total_items}</strong>
        </span>
        <span className="knowledge-summary-badge summary-due">
          今日復習 <strong>{stats.due_today}</strong>
        </span>
        <span className="knowledge-summary-badge summary-mastered">
          習得済み <strong>{stats.mastered}</strong>
        </span>
        <span className="knowledge-summary-badge summary-learning">
          学習中 <strong>{stats.learning}</strong>
        </span>
        <span className="knowledge-summary-badge summary-not-started">
          未開始 <strong>{stats.not_started}</strong>
        </span>
      </div>

      {/* フィルタバー */}
      <div className="knowledge-filter-bar">
        <input
          type="text"
          className="filter-category-input"
          placeholder="カテゴリで絞り込み..."
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        />

        <div className="filter-difficulty-pills">
          {DIFFICULTY_FILTERS.map((d) => (
            <button
              key={d.value}
              className={`pill ${difficultyFilter === d.value ? 'pill-active' : ''}`}
              onClick={() => setDifficultyFilter(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="filter-review-pills">
          {REVIEW_FILTERS.map((r) => (
            <button
              key={r.value}
              className={`pill ${reviewFilter === r.value ? 'pill-active' : ''}`}
              onClick={() => setReviewFilter(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* テーブル */}
      {items.length === 0 ? (
        <div className="empty-state">
          <p>知識アイテムがありません</p>
          <p>「+ 新規追加」ボタンから登録しましょう</p>
        </div>
      ) : (
        <div className="knowledge-table-wrapper">
          <table className="knowledge-table">
            <thead>
              <tr>
                <th>タイトル</th>
                <th>カテゴリ</th>
                <th>難易度</th>
                <th>定着度</th>
                <th>次回復習</th>
                <th>クイズ数</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <button
                      className="title-link"
                      onClick={() => navigate(`/knowledge/${item.id}`)}
                    >
                      {item.title}
                    </button>
                  </td>
                  <td>
                    {item.category ? (
                      <span className="category-badge">{item.category}</span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <span className={`difficulty-badge ${DIFFICULTY_MAP[item.difficulty]?.className || ''}`}>
                      {DIFFICULTY_MAP[item.difficulty]?.label || item.difficulty}
                    </span>
                  </td>
                  <td>
                    <div className="retention-bar">
                      <div
                        className="retention-fill"
                        style={{ width: `${item.retention_score || 0}%` }}
                      />
                    </div>
                    <span className="retention-text">{item.retention_score || 0}%</span>
                  </td>
                  <td>
                    <span className={getNextReviewClass(item.next_review_date)}>
                      {formatDate(item.next_review_date)}
                    </span>
                  </td>
                  <td className="text-center">{item.quiz_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default KnowledgeList;
