import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './GoogleCallback.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing | success | error
  const [message, setMessage] = useState('Google カレンダーを接続中...');

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage('Google カレンダーの接続がキャンセルされました。');
        setTimeout(() => navigate('/dashboard'), 3000);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('認証コードが見つかりません。');
        setTimeout(() => navigate('/dashboard'), 3000);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/google/auth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code, state })
        });

        if (response.ok) {
          setStatus('success');
          setMessage('Google カレンダーを接続しました！ダッシュボードに戻ります...');
        } else {
          const data = await response.json();
          setStatus('error');
          setMessage(data.error || '接続に失敗しました。');
        }
      } catch (err) {
        setStatus('error');
        setMessage('サーバーとの通信に失敗しました。');
      }

      // 3秒後にダッシュボードに遷移
      setTimeout(() => navigate('/dashboard'), 3000);
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="google-callback">
      <div className="callback-card">
        {status === 'processing' && <div className="spinner"></div>}
        {status === 'success' && <div className="success-icon">✅</div>}
        {status === 'error' && <div className="error-icon">❌</div>}
        <p className="callback-message">{message}</p>
      </div>
    </div>
  );
}

export default GoogleCallback;
