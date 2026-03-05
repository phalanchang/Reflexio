import React, { useState, useEffect, useCallback } from 'react';
import './Settings.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

const GOOGLE_EVENT_COLORS = {
  1: { name: 'ラベンダー', color: '#7986cb' },
  2: { name: 'セージ', color: '#33b679' },
  3: { name: 'ブドウ', color: '#8e24aa' },
  4: { name: 'フラミンゴ', color: '#e67c73' },
  5: { name: 'バナナ', color: '#f6bf26' },
  6: { name: 'みかん', color: '#f4511e' },
  7: { name: 'ピーコック', color: '#039be5' },
  8: { name: 'グラファイト', color: '#616161' },
  9: { name: 'ブルーベリー', color: '#3f51b5' },
  10: { name: 'バジル', color: '#0b8043' },
  11: { name: 'トマト', color: '#d50000' },
};

function Settings() {
  // OAuth設定 状態管理
  const [hasSettings, setHasSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // カテゴリ設定 状態管理
  const [categoryNames, setCategoryNames] = useState({});
  const [displayColors, setDisplayColors] = useState({});
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState(null);
  const [categorySuccess, setCategorySuccess] = useState(null);

  // 設定取得
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/google/settings`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setHasSettings(data.hasSettings);
        setSavedSettings(data.settings);
      }
    } catch (err) {
      console.error('設定取得エラー:', err);
      setError('設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  // カテゴリマッピング取得
  const fetchCategoryMappings = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/category-mappings`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const names = {};
        const colors = {};
        data.mappings.forEach(m => {
          names[m.google_color_id] = m.category_name;
          colors[m.google_color_id] = m.display_color;
        });
        setCategoryNames(names);
        setDisplayColors(colors);
      }
    } catch (err) {
      console.error('カテゴリ設定取得エラー:', err);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchCategoryMappings();
  }, [fetchSettings, fetchCategoryMappings]);

  // 保存（新規）
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/api/google/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message);
        setClientId('');
        setClientSecret('');
        fetchSettings();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 更新
  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/api/google/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message);
        setEditing(false);
        setClientId('');
        setClientSecret('');
        fetchSettings();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 削除
  const handleDelete = async () => {
    if (!window.confirm('OAuth設定を削除しますか？Google カレンダーの接続も解除されます。')) return;
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/api/google/settings`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message);
        setEditing(false);
        fetchSettings();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('削除に失敗しました');
    }
  };

  // 編集モード開始
  const handleEdit = () => {
    setEditing(true);
    setClientId(savedSettings?.client_id || '');
    setClientSecret(''); // セキュリティ上、secret は空で再入力させる
    setError(null);
    setSuccess(null);
  };

  // 編集キャンセル
  const handleCancel = () => {
    setEditing(false);
    setClientId('');
    setClientSecret('');
    setError(null);
  };

  // カテゴリ名変更
  const handleCategoryNameChange = (colorId, value) => {
    setCategoryNames(prev => ({ ...prev, [colorId]: value }));
  };

  // 表示色変更
  const handleDisplayColorChange = (colorId, value) => {
    setDisplayColors(prev => ({ ...prev, [colorId]: value }));
  };

  // カテゴリマッピング保存
  const handleSaveMappings = async () => {
    setCategorySaving(true);
    setCategoryError(null);
    setCategorySuccess(null);
    try {
      const mappings = Object.entries(categoryNames)
        .filter(([, name]) => name && name.trim() !== '')
        .map(([colorId, name]) => ({
          google_color_id: Number(colorId),
          category_name: name.trim(),
          display_color: displayColors[colorId] || GOOGLE_EVENT_COLORS[colorId].color
        }));
      const response = await fetch(`${API_URL}/api/category-mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mappings })
      });
      const data = await response.json();
      if (response.ok) {
        setCategorySuccess(data.message);
        fetchCategoryMappings();
      } else {
        setCategoryError(data.error || '保存に失敗しました');
      }
    } catch (err) {
      setCategoryError('カテゴリ設定の保存に失敗しました');
    } finally {
      setCategorySaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings">
        <h2>設定</h2>
        <div className="settings-loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="settings">
      <h2>設定</h2>

      {/* Google OAuth 設定セクション */}
      <div className="settings-section">
        <h3>🔑 Google API 設定</h3>
        <p className="settings-description">
          Google Cloud Console から取得した OAuth Client ID と Client Secret を登録してください。
          登録すると Google カレンダーと連携できるようになります。
        </p>

        <details className="settings-help">
          <summary className="settings-help-toggle">
            📖 Client ID / Secret の取得方法
          </summary>
          <div className="settings-help-content">
            <ol>
              <li><a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a> にアクセスし、新しいプロジェクトを作成</li>
              <li>「APIとサービス」→「ライブラリ」から <strong>Google Calendar API</strong> を有効化</li>
              <li>「OAuth 同意画面」を設定（ユーザータイプ: 外部、テストユーザーに自分のGmailを追加）</li>
              <li>「認証情報」→「OAuth クライアント ID」を作成（ウェブ アプリケーション）</li>
              <li>リダイレクト URI に <code>http://localhost:3003/auth/google/callback</code> を設定</li>
              <li>表示された Client ID と Client Secret を下のフォームに入力</li>
            </ol>
            <p className="settings-help-note">
              ※ 「アプリが未確認です」の警告が表示される場合がありますが、テストモードでの利用のため「続行」で問題ありません。
            </p>
          </div>
        </details>

        {/* フィードバックメッセージ */}
        {error && <div className="settings-error">{error}</div>}
        {success && <div className="settings-success">{success}</div>}

        {hasSettings && !editing ? (
          // 設定済み表示
          <div className="settings-saved">
            <div className="settings-field-display">
              <label>Client ID</label>
              <span className="settings-value">{savedSettings.client_id}</span>
            </div>
            <div className="settings-field-display">
              <label>Client Secret</label>
              <span className="settings-value settings-masked">{savedSettings.client_secret}</span>
            </div>
            <div className="settings-actions">
              <button className="btn-settings-edit" onClick={handleEdit}>編集</button>
              <button className="btn-settings-delete" onClick={handleDelete}>削除</button>
            </div>
          </div>
        ) : (
          // 入力フォーム（新規 or 編集）
          <form onSubmit={hasSettings ? handleUpdate : handleSave} className="settings-form">
            <div className="settings-field">
              <label htmlFor="clientId">Client ID</label>
              <input
                id="clientId"
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="xxxxx.apps.googleusercontent.com"
                required
              />
            </div>
            <div className="settings-field">
              <label htmlFor="clientSecret">Client Secret</label>
              <input
                id="clientSecret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="GOCSPX-xxxxx"
                required
              />
            </div>
            <div className="settings-form-actions">
              <button type="submit" className="btn-settings-save" disabled={saving}>
                {saving ? '保存中...' : (hasSettings ? '更新' : '保存')}
              </button>
              {hasSettings && (
                <button type="button" className="btn-settings-cancel" onClick={handleCancel}>
                  キャンセル
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* カテゴリ設定セクション */}
      <div className="settings-section" style={{ marginTop: '24px' }}>
        <h3>📊 カテゴリ設定</h3>
        <p className="settings-description">
          Google カレンダーの予定の色にカテゴリ名を設定すると、
          ダッシュボードの棒グラフにカテゴリ別の積み上げ表示ができます。
          設定しない色はデフォルトの色名（ラベンダー、バナナ等）で表示されます。
        </p>

        {categoryError && <div className="settings-error">{categoryError}</div>}
        {categorySuccess && <div className="settings-success">{categorySuccess}</div>}

        <table className="category-mapping-table">
          <thead>
            <tr>
              <th>色</th>
              <th>デフォルト名</th>
              <th>カテゴリ名</th>
              <th>表示色</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(GOOGLE_EVENT_COLORS).map(([colorId, defaultInfo]) => (
              <tr key={colorId}>
                <td>
                  <span className="color-swatch" style={{ backgroundColor: defaultInfo.color }} />
                </td>
                <td className="color-default-name">{defaultInfo.name}</td>
                <td>
                  <input
                    type="text"
                    value={categoryNames[colorId] || ''}
                    onChange={(e) => handleCategoryNameChange(colorId, e.target.value)}
                    placeholder={defaultInfo.name}
                    className="category-name-input"
                  />
                </td>
                <td>
                  <input
                    type="color"
                    value={displayColors[colorId] || defaultInfo.color}
                    onChange={(e) => handleDisplayColorChange(colorId, e.target.value)}
                    className="category-color-input"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="category-mapping-actions">
          <button className="btn-settings-save" onClick={handleSaveMappings} disabled={categorySaving}>
            {categorySaving ? '保存中...' : 'カテゴリ設定を保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
