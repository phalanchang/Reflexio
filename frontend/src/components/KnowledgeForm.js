import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QuizForm from './QuizForm';
import { useToast } from './Toast';
import './KnowledgeForm.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

function KnowledgeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    difficulty: 'medium'
  });
  const [quizzes, setQuizzes] = useState([]);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      fetch(`${API_URL}/api/knowledge/${id}`, { credentials: 'include' })
        .then(res => {
          if (!res.ok) throw new Error('取得失敗');
          return res.json();
        })
        .then(data => {
          setFormData({
            title: data.knowledge_item.title || '',
            content: data.knowledge_item.content || '',
            category: data.knowledge_item.category || '',
            difficulty: data.knowledge_item.difficulty || 'medium'
          });
        })
        .catch(() => {
          showToast('知識データの取得に失敗しました', 'error');
          navigate('/knowledge');
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, navigate, showToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleQuizAdd = (quizData) => {
    setQuizzes(prev => [...prev, quizData]);
    setShowQuizForm(false);
  };

  const handleQuizRemove = (index) => {
    setQuizzes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    if (!formData.content.trim()) {
      setError('コンテンツを入力してください');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const body = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category.trim() || null,
        difficulty: formData.difficulty
      };

      if (!isEditMode && quizzes.length > 0) {
        body.quizzes = quizzes;
      }

      const url = isEditMode
        ? `${API_URL}/api/knowledge/${id}`
        : `${API_URL}/api/knowledge`;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '保存に失敗しました');
      }

      const data = await response.json();
      const knowledgeId = isEditMode ? id : data.knowledge_item.id;
      showToast(isEditMode ? '知識を更新しました' : '知識を登録しました', 'success');
      navigate(`/knowledge/${knowledgeId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-message">読み込み中...</div>;
  }

  return (
    <div className="knowledge-form-container">
      <h2 className="knowledge-form-title">
        {isEditMode ? '知識の編集' : '知識の登録'}
      </h2>

      <form className="knowledge-form" onSubmit={handleSubmit}>
        {error && <div className="knowledge-form-error">{error}</div>}

        <div className="form-group">
          <label>タイトル <span className="required">*</span></label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            maxLength={255}
            placeholder="知識のタイトルを入力..."
          />
        </div>

        <div className="form-group">
          <label>コンテンツ <span className="required">*</span></label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={8}
            placeholder="知識の内容を入力..."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>カテゴリ</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="例: プログラミング, 英語, 数学..."
            />
          </div>

          <div className="form-group">
            <label>難易度</label>
            <select name="difficulty" value={formData.difficulty} onChange={handleChange}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* クイズ同時作成セクション（新規作成時のみ） */}
        {!isEditMode && (
          <div className="quiz-section">
            <div className="quiz-section-header">
              <h3>クイズ（任意）</h3>
              {!showQuizForm && (
                <button
                  type="button"
                  className="btn btn-add-quiz"
                  onClick={() => setShowQuizForm(true)}
                >
                  + クイズを追加
                </button>
              )}
            </div>

            {quizzes.length > 0 && (
              <div className="quiz-preview-list">
                {quizzes.map((q, i) => (
                  <div key={i} className="quiz-preview-item">
                    <div className="quiz-preview-content">
                      <span className="quiz-preview-label">Q{i + 1}:</span>
                      <span className="quiz-preview-question">{q.question}</span>
                      <span className="quiz-type-badge">
                        {q.quiz_type === 'multiple_choice' ? '選択式' : '自由記述'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-remove-quiz"
                      onClick={() => handleQuizRemove(i)}
                      title="削除"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showQuizForm && (
              <QuizForm
                inline={true}
                onSave={handleQuizAdd}
                onCancel={() => setShowQuizForm(false)}
              />
            )}
          </div>
        )}

        <div className="knowledge-form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? '保存中...' : (isEditMode ? '更新' : '登録')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/knowledge')}
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}

export default KnowledgeForm;
