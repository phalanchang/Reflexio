import React, { useEffect } from 'react';
import './ShortcutHelp.css';

const SHORTCUTS = [
  { key: 'N', description: '新規追加（フォーム表示）' },
  { key: 'E', description: 'フォーカス行を編集（テーブルのみ）' },
  { key: 'Delete', description: '選択行を削除' },
  { key: '↑ / ↓', description: 'フォーカス行を移動（テーブルのみ）' },
  { key: 'Space', description: 'チェックボックス切替（テーブルのみ）' },
  { key: '/', description: '検索フィールドにフォーカス' },
  { key: 'Escape', description: 'フォーム / モーダル / メニューを閉じる' },
  { key: '?', description: 'このヘルプを表示' },
];

function ShortcutHelp({ isOpen, onClose }) {
  // ESC で閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="shortcut-help-overlay" onClick={onClose}>
      <div className="shortcut-help-modal" onClick={e => e.stopPropagation()}>
        <div className="shortcut-help-header">
          <h3>キーボードショートカット</h3>
          <button className="shortcut-help-close" onClick={onClose}>✕</button>
        </div>
        <table className="shortcut-help-table">
          <tbody>
            {SHORTCUTS.map(({ key, description }) => (
              <tr key={key}>
                <td className="shortcut-help-key">
                  <kbd>{key}</kbd>
                </td>
                <td className="shortcut-help-desc">{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ShortcutHelp;
