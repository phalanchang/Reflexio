import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import GoogleConnect from './GoogleConnect';
import TimeChart from './TimeChart';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

function Dashboard() {
  const [googleStatus, setGoogleStatus] = useState({ connected: false });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7days');
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/google/auth/status`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setGoogleStatus(data);
      }
    } catch (error) {
      console.error('Google接続状態取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async (selectedPeriod) => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const response = await fetch(
        `${API_URL}/api/calendar/summary?period=${selectedPeriod}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'TOKEN_EXPIRED') {
          setSummaryError('Google カレンダーの再接続が必要です');
        } else if (errorData.code === 'RATE_LIMITED') {
          setSummaryError('しばらく待ってから再度お試しください');
        } else {
          setSummaryError('データの取得に失敗しました');
        }
        return;
      }
      const data = await response.json();
      setSummaryData(data);
    } catch (error) {
      console.error('集計データ取得エラー:', error);
      setSummaryError('Google カレンダーに接続できません');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoogleStatus();
  }, [fetchGoogleStatus]);

  useEffect(() => {
    if (googleStatus.connected) {
      fetchSummary(period);
    }
  }, [googleStatus.connected, period, fetchSummary]);

  const handleConnect = async () => {
    try {
      const response = await fetch(`${API_URL}/api/google/auth/url`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Google認証URL取得エラー:', error);
    }
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };

  if (loading) {
    return (
      <div className="dashboard">
        <h2>ダッシュボード</h2>
        <div className="dashboard-loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2>ダッシュボード</h2>
      <div className="dashboard-widgets">
        {/* 時間の使い方カード */}
        <div className="dashboard-card dashboard-card-large">
          <div className="dashboard-card-header">
            <h3>📈 時間の使い方</h3>
            {googleStatus.connected && (
              <div className="period-tabs">
                {[
                  { value: '7days', label: '7日' },
                  { value: 'week', label: '週' },
                  { value: 'month', label: '月' },
                ].map(tab => (
                  <button
                    key={tab.value}
                    className={`period-tab ${period === tab.value ? 'period-tab-active' : ''}`}
                    onClick={() => handlePeriodChange(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="dashboard-card-body">
            {googleStatus.connected ? (
              // 接続済み → 棒グラフ表示
              summaryLoading ? (
                <div className="chart-loading">読み込み中...</div>
              ) : summaryError ? (
                <div className="chart-error">
                  <p>{summaryError}</p>
                  <button onClick={() => fetchSummary(period)}>再試行</button>
                </div>
              ) : summaryData && summaryData.data.length > 0 ? (
                <TimeChart data={summaryData.data} calendars={summaryData.calendars} />
              ) : (
                <div className="chart-empty">
                  <p>この期間にイベントはありません</p>
                </div>
              )
            ) : (googleStatus.hasSettings || googleStatus.hasEnvConfig) ? (
              // 設定あり + 未接続 → 接続ボタン
              <div className="connect-prompt">
                <p>Google カレンダーを接続すると、</p>
                <p>直近の時間の使い方をグラフで確認できます。</p>
                <button className="btn-google-connect" onClick={handleConnect}>
                  🔗 Google カレンダーを接続
                </button>
              </div>
            ) : (
              // 設定なし → 設定画面案内
              <div className="connect-prompt">
                <p>Google カレンダーと連携するには、</p>
                <p>まず設定画面で Google API の設定を行ってください。</p>
                <Link to="/settings" className="btn-google-connect">
                  ⚙️ 設定画面へ
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Google カレンダー接続状況カード */}
        <GoogleConnect
          status={googleStatus}
          onStatusChange={fetchGoogleStatus}
        />
      </div>
    </div>
  );
}

export default Dashboard;
