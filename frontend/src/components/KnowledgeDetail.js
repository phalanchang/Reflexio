import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QuizForm from './QuizForm';
import { useToast } from './Toast';
import './KnowledgeDetail.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

const DIFFICULTY_MAP = {
  easy: { label: 'Easy', className: 'difficulty-easy' },
  medium: { label: 'Medium', className: 'difficulty-medium' },
  hard: { label: 'Hard', className: 'difficulty-hard' }
};

function KnowledgeDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();

  const [knowledge, setKnowledge] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // 'knowledge' | quizId | null

  const fetchDetail = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/knowledge/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('取得失敗');
      const data = await response.json();
      setKnowledge(data.knowledge_item);
      setQuizzes(data.knowledge_item.quizzes || []);
    } catch (err) {
      showToast('知識データの取得に失敗しました', 'error');
      navigate('/knowledge');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleDeleteKnowledge = async () => {
    try {
      const response = await fetch(`${API_URL}/api/knowledge/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('削除失敗');
      showToast('知識を削除しました', 'success');
      navigate('/knowledge');
    } catch (err) {
      showToast('削除に失敗しました', 'error');
    }
    setDeleteConfirm(null);
  };

  const handleAddQuiz = async (quizData) => {
    try {
      const response = await fetch(`${API_URL}/api/knowledge/${id}/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(quizData)
      });
      if (!response.ok) throw new Error('追加失敗');
      showToast('クイズを追加しました', 'success');
      setShowQuizForm(false);
      fetchDetail();
    } catch (err) {
      showToast('クイズの追加に失敗しました', 'error');
    }
  };

  const handleEditQuiz = async (quizData) => {
    try {
      const response = await fetch(`${API_URL}/api/quizzes/${editingQuiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(quizData)
      });
      if (!response.ok) throw new Error('更新失敗');
      showToast('クイズを更新しました', 'success');
      setEditingQuiz(null);
      fetchDetail();
    } catch (err) {
      showToast('クイズの更新に失敗しました', 'error');
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    try {
      const response = await fetch(`${API_URL}/api/quizzes/${quizId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('削除失敗');
      showToast('クイズを削除しました', 'success');
      setDeleteConfirm(null);
      fetchDetail();
    } catch (err) {
      showToast('クイズの削除に失敗しました', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="loading-message">読み込み中...</div>;
  }

  if (!knowledge) {
    return <div className="loading-message">データが見つかりません</div>;
  }

  return (
    <div className="knowledge-detail-container">
      {/* ヘッダー */}
      <div className="knowledge-detail-header">
        <div className="knowledge-detail-title-row">
          <h2>{knowledge.title}</h2>
          <div className="knowledge-detail-actions">
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/knowledge/${id}/edit`)}
            >
              編集
            </button>
            <button
              className="btn btn-danger"
              onClick={() => setDeleteConfirm('knowledge')}
            >
              削除
            </button>
          </div>
        </div>

        <div className="knowledge-detail-meta">
          {knowledge.category && (
            <span className="category-badge">{knowledge.category}</span>
          )}
          <span className={`difficulty-badge ${DIFFICULTY_MAP[knowledge.difficulty]?.className || ''}`}>
            {DIFFICULTY_MAP[knowledge.difficulty]?.label || knowledge.difficulty}
          </span>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="knowledge-detail-content">
        <h3>コンテンツ</h3>
        <div className="content-body">
          {knowledge.content.split('\n').map((line, i) => (
            <p key={i}>{line || '\u00A0'}</p>
          ))}
        </div>
      </div>

      {/* SM-2パラメータ */}
      <div className="knowledge-detail-sm2">
        <h3>学習状況</h3>
        <div className="sm2-grid">
          <div className="sm2-item">
            <span className="sm2-label">定着度</span>
            <span className="sm2-value">{knowledge.retention_score || 0}%</span>
          </div>
          <div className="sm2-item">
            <span className="sm2-label">EF</span>
            <span className="sm2-value">{knowledge.easiness_factor ? Number(knowledge.easiness_factor).toFixed(2) : '2.50'}</span>
          </div>
          <div className="sm2-item">
            <span className="sm2-label">復習回数</span>
            <span className="sm2-value">{knowledge.repetitions || 0}</span>
          </div>
          <div className="sm2-item">
            <span className="sm2-label">間隔（日）</span>
            <span className="sm2-value">{knowledge.interval_days || 0}</span>
          </div>
          <div className="sm2-item">
            <span className="sm2-label">次回復習</span>
            <span className="sm2-value">{formatDate(knowledge.next_review_date)}</span>
          </div>
        </div>
      </div>

      {/* クイズ管理セクション */}
      <div className="knowledge-detail-quizzes">
        <div className="quiz-section-header">
          <h3>クイズ（{quizzes.length}件）</h3>
          {!showQuizForm && !editingQuiz && (
            <button
              className="btn btn-add-quiz"
              onClick={() => setShowQuizForm(true)}
            >
              + クイズ追加
            </button>
          )}
        </div>

        {/* クイズ追加フォーム */}
        {showQuizForm && (
          <QuizForm
            onSave={handleAddQuiz}
            onCancel={() => setShowQuizForm(false)}
          />
        )}

        {/* クイズ編集フォーム */}
        {editingQuiz && (
          <QuizForm
            quiz={editingQuiz}
            onSave={handleEditQuiz}
            onCancel={() => setEditingQuiz(null)}
          />
        )}

        {/* クイズ一覧 */}
        {quizzes.length === 0 && !showQuizForm ? (
          <p className="text-muted">クイズはまだ登録されていません</p>
        ) : (
          <div className="quiz-list">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="quiz-item">
                <div className="quiz-item-content">
                  <div className="quiz-item-question">
                    <strong>Q:</strong> {quiz.question}
                  </div>
                  <div className="quiz-item-answer">
                    <strong>A:</strong> {quiz.answer.length > 80 ? quiz.answer.substring(0, 80) + '...' : quiz.answer}
                  </div>
                  <span className="quiz-type-badge">
                    {quiz.quiz_type === 'multiple_choice' ? '選択式' : '自由記述'}
                  </span>
                </div>
                <div className="quiz-item-actions">
                  <button
                    className="btn btn-sm btn-edit"
                    onClick={() => {
                      setShowQuizForm(false);
                      setEditingQuiz(quiz);
                    }}
                  >
                    編集
                  </button>
                  <button
                    className="btn btn-sm btn-delete"
                    onClick={() => setDeleteConfirm(quiz.id)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      {deleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>削除の確認</h3>
            <p>
              {deleteConfirm === 'knowledge'
                ? 'この知識アイテムとすべてのクイズを削除しますか？この操作は元に戻せません。'
                : 'このクイズを削除しますか？'}
            </p>
            <div className="delete-confirm-actions">
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (deleteConfirm === 'knowledge') {
                    handleDeleteKnowledge();
                  } else {
                    handleDeleteQuiz(deleteConfirm);
                  }
                }}
              >
                削除する
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 戻るリンク */}
      <div className="knowledge-detail-back">
        <button className="btn btn-link" onClick={() => navigate('/knowledge')}>
          &larr; 学習管理に戻る
        </button>
      </div>
    </div>
  );
}

export default KnowledgeDetail;
