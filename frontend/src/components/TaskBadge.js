import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './TaskBadge.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

function TaskBadge() {
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();

  const fetchBadgeCount = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/badge`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.pending_count);
      }
    } catch (error) {
      // バッジ取得失敗は静かに無視（ヘッダーの動作を妨げない）
    }
  }, []);

  useEffect(() => {
    fetchBadgeCount();

    // 60秒ごとにポーリング
    const interval = setInterval(fetchBadgeCount, 60000);

    // タブがアクティブになったら即リフレッシュ
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchBadgeCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // カスタムイベントでリフレッシュ（タスク完了時などに発火）
    const handleRefresh = () => fetchBadgeCount();
    window.addEventListener('task-badge-refresh', handleRefresh);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('task-badge-refresh', handleRefresh);
    };
  }, [fetchBadgeCount]);

  const handleClick = () => {
    navigate('/tasks');
  };

  return (
    <button className="task-badge-button" onClick={handleClick} title="今日のタスク">
      <span className="task-badge-label">DailyTask</span>
      {pendingCount > 0 && (
        <span className="task-badge-count">{pendingCount > 99 ? '99+' : pendingCount}</span>
      )}
    </button>
  );
}

export default TaskBadge;
