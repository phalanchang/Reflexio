import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';
import './TaskTemplateForm.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

const WEEKDAY_OPTIONS = [
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' },
  { value: 7, label: '日' },
];

function TaskTemplateForm({ template, onSave, onCancel }) {
  const isEditMode = !!template;
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState('daily');
  const [triggerTime, setTriggerTime] = useState('09:00');
  const [weekdays, setWeekdays] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setTitle(template.title || '');
      setDescription(template.description || '');
      setTaskType(template.task_type || 'daily');
      setTriggerTime(template.trigger_time ? template.trigger_time.substring(0, 5) : '09:00');
      try {
        const wd = typeof template.weekdays === 'string' ? JSON.parse(template.weekdays) : (template.weekdays || []);
        setWeekdays(wd);
      } catch (e) {
        setWeekdays([]);
      }
    }
  }, [template]);

  const handleWeekdayToggle = (day) => {
    setWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('タイトルは必須です', 'error');
      return;
    }
    if (taskType === 'weekday' && weekdays.length === 0) {
      showToast('曜日を1つ以上選択してください', 'error');
      return;
    }

    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        task_type: taskType,
        trigger_time: (taskType === 'daily' || taskType === 'weekday') ? `${triggerTime}:00` : null,
        weekdays: taskType === 'weekday' ? weekdays : null,
      };

      const url = isEditMode
        ? `${API_URL}/api/tasks/templates/${template.id}`
        : `${API_URL}/api/tasks/templates`;

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (response.ok) {
        showToast(isEditMode ? 'テンプレートを更新しました' : 'タスクを作成しました', 'success');
        onSave();
      } else {
        const data = await response.json();
        showToast(data.error || '保存に失敗しました', 'error');
      }
    } catch (error) {
      console.error('[tasks] フォーム送信エラー:', error);
      showToast('保存に失敗しました', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onCancel();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="task-form-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="task-form-modal">
        <h3>{isEditMode ? 'テンプレート編集' : '新しいタスク'}</h3>
        <form onSubmit={handleSubmit}>
          {/* タイトル */}
          <div className="task-form-field">
            <label>タイトル <span className="required">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タスク名を入力"
              autoFocus
            />
          </div>

          {/* 説明 */}
          <div className="task-form-field">
            <label>説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="説明（任意）"
              rows={2}
            />
          </div>

          {/* タスクタイプ */}
          <div className="task-form-field">
            <label>タスクタイプ</label>
            <div className="task-type-selector">
              {[
                { value: 'normal', label: '通常', desc: '1回限りのタスク' },
                { value: 'daily', label: 'Daily', desc: '毎日繰り返す' },
                { value: 'weekday', label: '曜日', desc: '指定曜日に繰り返す' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`type-option ${taskType === opt.value ? 'selected' : ''}`}
                  onClick={() => setTaskType(opt.value)}
                >
                  <span className="type-option-label">{opt.label}</span>
                  <span className="type-option-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* トリガー時刻（Daily/曜日） */}
          {(taskType === 'daily' || taskType === 'weekday') && (
            <div className="task-form-field">
              <label>トリガー時刻</label>
              <input
                type="time"
                value={triggerTime}
                onChange={(e) => setTriggerTime(e.target.value)}
              />
              <span className="field-hint">この時刻以降にタスクがアクティブになります</span>
            </div>
          )}

          {/* 曜日選択（曜日タスク） */}
          {taskType === 'weekday' && (
            <div className="task-form-field">
              <label>実施曜日 <span className="required">*</span></label>
              <div className="weekday-selector">
                {WEEKDAY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`weekday-btn ${weekdays.includes(opt.value) ? 'selected' : ''}`}
                    onClick={() => handleWeekdayToggle(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ボタン */}
          <div className="task-form-actions">
            <button type="button" className="task-form-cancel" onClick={onCancel}>
              キャンセル
            </button>
            <button type="submit" className="task-form-submit" disabled={saving}>
              {saving ? '保存中...' : isEditMode ? '更新' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskTemplateForm;
