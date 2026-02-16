import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './GoogleConnect.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

function GoogleConnect({ status, onStatusChange }) {
  const [disconnecting, setDisconnecting] = useState(false);

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

  const handleDisconnect = async () => {
    if (!window.confirm('Google カレンダーの接続を解除しますか？')) return;
    setDisconnecting(true);
    try {
      const response = await fetch(`${API_URL}/api/google/auth/disconnect`, {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        onStatusChange();
      }
    } catch (error) {
      console.error('切断エラー:', error);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <h3>🔗 Google カレンダー</h3>
      </div>
      <div className="dashboard-card-body">
        {status.connected ? (
          <div className="google-connected">
            <p className="connection-status">✅ 接続済み</p>
            <p className="connection-email">{status.email}</p>
            <button
              className="btn-disconnect"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? '解除中...' : '接続を解除'}
            </button>
          </div>
        ) : (
          <div className="google-disconnected">
            {(status.hasSettings || status.hasEnvConfig) ? (
              <>
                <p className="connection-status">未接続</p>
                <button className="btn-google-connect" onClick={handleConnect}>
                  Google カレンダーを接続
                </button>
              </>
            ) : (
              <>
                <p className="connection-status">未設定</p>
                <p className="connection-hint">
                  設定画面で Google API の設定を行ってください
                </p>
                <Link to="/settings" className="btn-settings-link">
                  設定画面へ
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GoogleConnect;
