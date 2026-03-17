import React, { useState, useEffect } from 'react';
import './QuizForm.css';

function QuizForm({ quiz, onSave, onCancel, inline }) {
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    quiz_type: 'free_text',
    choices: ['', '', '', ''],
    correct_choice: 0
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (quiz) {
      setFormData({
        question: quiz.question || '',
        answer: quiz.answer || '',
        quiz_type: quiz.quiz_type || 'free_text',
        choices: quiz.choices || ['', '', '', ''],
        correct_choice: quiz.correct_choice || 0
      });
    }
  }, [quiz]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleChoiceChange = (index, value) => {
    setFormData(prev => {
      const newChoices = [...prev.choices];
      newChoices[index] = value;
      return { ...prev, choices: newChoices };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.question.trim()) {
      setError('質問を入力してください');
      return;
    }
    if (!formData.answer.trim()) {
      setError('解答を入力してください');
      return;
    }
    if (formData.quiz_type === 'multiple_choice') {
      const filledChoices = formData.choices.filter(c => c.trim());
      if (filledChoices.length < 2) {
        setError('選択肢を2つ以上入力してください');
        return;
      }
    }

    const data = {
      question: formData.question.trim(),
      answer: formData.answer.trim(),
      quiz_type: formData.quiz_type
    };

    if (formData.quiz_type === 'multiple_choice') {
      data.choices = formData.choices;
      data.correct_choice = formData.correct_choice;
    }

    onSave(data);

    // inline モードでは送信後にフォームをリセット
    if (inline && !quiz) {
      setFormData({
        question: '',
        answer: '',
        quiz_type: 'free_text',
        choices: ['', '', '', ''],
        correct_choice: 0
      });
    }
  };

  return (
    <div className={`quiz-form-container ${inline ? 'quiz-form-inline' : ''}`}>
      {!inline && <h3 className="quiz-form-title">{quiz ? 'クイズ編集' : 'クイズ追加'}</h3>}
      <form className="quiz-form" onSubmit={handleSubmit}>
        {error && <div className="quiz-form-error">{error}</div>}

        <div className="form-group">
          <label>質問 <span className="required">*</span></label>
          <textarea
            name="question"
            value={formData.question}
            onChange={handleChange}
            rows={3}
            placeholder="質問を入力..."
          />
        </div>

        <div className="form-group">
          <label>解答 <span className="required">*</span></label>
          <textarea
            name="answer"
            value={formData.answer}
            onChange={handleChange}
            rows={3}
            placeholder="解答を入力..."
          />
        </div>

        <div className="form-group">
          <label>形式</label>
          <select name="quiz_type" value={formData.quiz_type} onChange={handleChange}>
            <option value="free_text">自由記述</option>
            <option value="multiple_choice">選択式</option>
          </select>
        </div>

        {formData.quiz_type === 'multiple_choice' && (
          <div className="form-group">
            <label>選択肢</label>
            <div className="choices-list">
              {formData.choices.map((choice, index) => (
                <div key={index} className="choice-item">
                  <input
                    type="radio"
                    name="correct_choice"
                    value={index}
                    checked={formData.correct_choice === index}
                    onChange={() => setFormData(prev => ({ ...prev, correct_choice: index }))}
                    title="正解にする"
                  />
                  <input
                    type="text"
                    value={choice}
                    onChange={(e) => handleChoiceChange(index, e.target.value)}
                    placeholder={`選択肢 ${index + 1}`}
                    className="choice-input"
                  />
                </div>
              ))}
            </div>
            <p className="choice-hint">ラジオボタンで正解を選択してください</p>
          </div>
        )}

        <div className="quiz-form-actions">
          <button type="submit" className="btn btn-primary">
            {quiz ? '更新' : '追加'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}

export default QuizForm;
