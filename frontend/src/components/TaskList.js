import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from './Toast';
import TaskTemplateForm from './TaskTemplateForm';
import './TaskList.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

const WEEKDAY_LABELS = ['', '月', '火', '水', '木', '金', '土', '日'];
const TYPE_LABELS = { normal: '通常', daily: 'Daily', weekday: '曜日' };
const TYPE_COLORS = { normal: '#7f8c8d', daily: '#e74c3c', weekday: '#3498db' };

function TaskList() {
  const [todayTasks, setTodayTasks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'templates'
  const { showToast } = useToast();

  const fetchTodayTasks = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/today`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTodayTasks(data);
      } else {
        showToast('タスクの取得に失敗しました', 'error');
      }
    } catch (error) {
      console.error('[tasks] 取得エラー:', error);
      showToast('タスクの取得に失敗しました', 'error');
    }
  }, [showToast]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/templates`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('[tasks] テンプレート取得エラー:', error);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchTodayTasks(), fetchTemplates()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchTodayTasks, fetchTemplates]);

  const refreshBadge = () => {
    window.dispatchEvent(new Event('task-badge-refresh'));
  };

  const handleComplete = async (instanceId) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/instances/${instanceId}/complete`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (response.ok) {
        showToast('タスクを完了しました！', 'success');
        fetchTodayTasks();
        refreshBadge();
      } else {
        showToast('タスクの完了に失敗しました', 'error');
      }
    } catch (error) {
      showToast('タスクの完了に失敗しました', 'error');
    }
  };

  const handleSkip = async (instanceId) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/instances/${instanceId}/skip`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (response.ok) {
        showToast('タスクをスキップしました', 'success');
        fetchTodayTasks();
        refreshBadge();
      }
    } catch (error) {
      showToast('スキップに失敗しました', 'error');
    }
  };

  const handleRevert = async (instanceId) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/instances/${instanceId}/revert`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (response.ok) {
        showToast('タスクを未完了に戻しました', 'success');
        fetchTodayTasks();
        refreshBadge();
      }
    } catch (error) {
      showToast('状態変更に失敗しました', 'error');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('このテンプレートを削除しますか？')) return;
    try {
      const response = await fetch(`${API_URL}/api/tasks/templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        showToast('テンプレートを削除しました', 'success');
        fetchTemplates();
        fetchTodayTasks();
        refreshBadge();
      } else {
        showToast('削除に失敗しました', 'error');
      }
    } catch (error) {
      showToast('削除に失敗しました', 'error');
    }
  };

  const handleToggleActive = async (template) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !template.is_active })
      });
      if (response.ok) {
        showToast(template.is_active ? 'テンプレートを無効にしました' : 'テンプレートを有効にしました', 'success');
        fetchTemplates();
      }
    } catch (error) {
      showToast('変更に失敗しました', 'error');
    }
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingTemplate(null);
    fetchTemplates();
    fetchTodayTasks();
    refreshBadge();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  const pendingTasks = todayTasks.filter(t => t.status === 'pending');
  const completedTasks = todayTasks.filter(t => t.status === 'completed');
  const skippedTasks = todayTasks.filter(t => t.status === 'skipped');

  if (loading) {
    return <div className="task-loading">読み込み中...</div>;
  }

  return (
    <div className="task-list-container">
      <div className="task-header">
        <h2>タスク管理</h2>
        <button className="task-add-button" onClick={() => { setEditingTemplate(null); setShowForm(true); }}>
          + 新しいタスク
        </button>
      </div>

      {/* タブ切替 */}
      <div className="task-tabs">
        <button
          className={`task-tab ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          今日のタスク
          {pendingTasks.length > 0 && <span className="task-tab-badge">{pendingTasks.length}</span>}
        </button>
        <button
          className={`task-tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          テンプレート管理
          <span className="task-tab-count">({templates.length})</span>
        </button>
      </div>

      {/* 今日のタスク */}
      {activeTab === 'today' && (
        <div className="task-today-section">
          {todayTasks.length === 0 ? (
            <div className="task-empty">
              <p>今日のタスクはありません</p>
              <p className="task-empty-hint">「+ 新しいタスク」からDailyタスクを登録しましょう</p>
            </div>
          ) : (
            <>
              {/* 未完了 */}
              {pendingTasks.length > 0 && (
                <div className="task-group">
                  <h3 className="task-group-title">
                    未完了 <span className="task-group-count">{pendingTasks.length}件</span>
                  </h3>
                  <ul className="task-checklist">
                    {pendingTasks.map(task => (
                      <li key={task.id} className="task-item pending">
                        <button
                          className="task-checkbox"
                          onClick={() => handleComplete(task.id)}
                          title="完了にする"
                        >
                          <span className="checkbox-icon">○</span>
                        </button>
                        <div className="task-item-content">
                          <span className="task-item-title">{task.title}</span>
                          {task.description && <span className="task-item-desc">{task.description}</span>}
                        </div>
                        <span className="task-type-badge" style={{ backgroundColor: TYPE_COLORS[task.task_type] }}>
                          {TYPE_LABELS[task.task_type]}
                        </span>
                        <button className="task-skip-button" onClick={() => handleSkip(task.id)} title="スキップ">
                          Skip
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 完了済み */}
              {completedTasks.length > 0 && (
                <div className="task-group">
                  <h3 className="task-group-title completed-title">
                    完了 <span className="task-group-count">{completedTasks.length}件</span>
                  </h3>
                  <ul className="task-checklist">
                    {completedTasks.map(task => (
                      <li key={task.id} className="task-item completed">
                        <button
                          className="task-checkbox checked"
                          onClick={() => handleRevert(task.id)}
                          title="未完了に戻す"
                        >
                          <span className="checkbox-icon">✓</span>
                        </button>
                        <div className="task-item-content">
                          <span className="task-item-title">{task.title}</span>
                        </div>
                        <span className="task-type-badge" style={{ backgroundColor: TYPE_COLORS[task.task_type], opacity: 0.6 }}>
                          {TYPE_LABELS[task.task_type]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* スキップ済み */}
              {skippedTasks.length > 0 && (
                <div className="task-group">
                  <h3 className="task-group-title skipped-title">
                    スキップ <span className="task-group-count">{skippedTasks.length}件</span>
                  </h3>
                  <ul className="task-checklist">
                    {skippedTasks.map(task => (
                      <li key={task.id} className="task-item skipped">
                        <button
                          className="task-checkbox"
                          onClick={() => handleRevert(task.id)}
                          title="未完了に戻す"
                        >
                          <span className="checkbox-icon">–</span>
                        </button>
                        <div className="task-item-content">
                          <span className="task-item-title">{task.title}</span>
                        </div>
                        <span className="task-type-badge" style={{ backgroundColor: TYPE_COLORS[task.task_type], opacity: 0.5 }}>
                          {TYPE_LABELS[task.task_type]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* テンプレート管理 */}
      {activeTab === 'templates' && (
        <div className="task-templates-section">
          {templates.length === 0 ? (
            <div className="task-empty">
              <p>テンプレートが登録されていません</p>
            </div>
          ) : (
            <table className="task-template-table">
              <thead>
                <tr>
                  <th>タイトル</th>
                  <th>タイプ</th>
                  <th>トリガー時刻</th>
                  <th>曜日</th>
                  <th>有効</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(tmpl => (
                  <tr key={tmpl.id} className={!tmpl.is_active ? 'inactive-row' : ''}>
                    <td>
                      <div className="template-title">{tmpl.title}</div>
                      {tmpl.description && <div className="template-desc">{tmpl.description}</div>}
                    </td>
                    <td>
                      <span className="task-type-badge" style={{ backgroundColor: TYPE_COLORS[tmpl.task_type] }}>
                        {TYPE_LABELS[tmpl.task_type]}
                      </span>
                    </td>
                    <td>
                      {(tmpl.task_type === 'daily' || tmpl.task_type === 'weekday')
                        ? (tmpl.trigger_time || '09:00').substring(0, 5)
                        : '-'}
                    </td>
                    <td>
                      {tmpl.task_type === 'weekday' ? (
                        <div className="weekday-chips">
                          {(() => {
                            let wd = [];
                            try { wd = typeof tmpl.weekdays === 'string' ? JSON.parse(tmpl.weekdays) : (tmpl.weekdays || []); } catch(e) { wd = []; }
                            return [1,2,3,4,5,6,7].map(d => (
                              <span key={d} className={`weekday-chip ${wd.includes(d) ? 'active' : ''}`}>
                                {WEEKDAY_LABELS[d]}
                              </span>
                            ));
                          })()}
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      <button
                        className={`toggle-active-btn ${tmpl.is_active ? 'on' : 'off'}`}
                        onClick={() => handleToggleActive(tmpl)}
                      >
                        {tmpl.is_active ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td>
                      <div className="template-actions">
                        <button className="template-edit-btn" onClick={() => { setEditingTemplate(tmpl); setShowForm(true); }}>
                          編集
                        </button>
                        <button className="template-delete-btn" onClick={() => handleDeleteTemplate(tmpl.id)}>
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* テンプレート作成/編集フォーム */}
      {showForm && (
        <TaskTemplateForm
          template={editingTemplate}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
}

export default TaskList;
