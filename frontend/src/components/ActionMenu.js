import React, { useState, useRef, useEffect } from 'react';
import './ActionMenu.css';

const STATUS_MAP = {
  not_started: { label: '未着手' },
  in_progress: { label: '進行中' },
  completed: { label: '完了' }
};

function ActionMenu({ wish, onEdit, onDelete, onStatusChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showStatusSub, setShowStatusSub] = useState(false);
  const menuRef = useRef(null);

  // 外部クリックで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowStatusSub(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ESC で閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setShowStatusSub(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  return (
    <div className="action-menu" ref={menuRef}>
      <button
        className="action-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="操作メニュー"
      >
        ⋯
      </button>
      {isOpen && (
        <div className="action-menu-dropdown">
          <button
            className="action-menu-item"
            onClick={() => { onEdit(wish); setIsOpen(false); }}
          >
            📝 編集
          </button>
          <div
            className="action-menu-item action-menu-status"
            onMouseEnter={() => setShowStatusSub(true)}
            onMouseLeave={() => setShowStatusSub(false)}
          >
            <span>🔄 ステータス変更</span>
            {showStatusSub && (
              <div className="action-menu-submenu">
                {Object.entries(STATUS_MAP)
                  .filter(([key]) => key !== wish.status)
                  .map(([key, { label }]) => (
                    <button
                      key={key}
                      className="action-menu-item"
                      onClick={() => {
                        onStatusChange(wish.id, key);
                        setIsOpen(false);
                        setShowStatusSub(false);
                      }}
                    >
                      {label}
                    </button>
                  ))
                }
              </div>
            )}
          </div>
          <div className="action-menu-divider" />
          <button
            className="action-menu-item action-menu-item-danger"
            onClick={() => { onDelete(wish); setIsOpen(false); }}
          >
            🗑 削除
          </button>
        </div>
      )}
    </div>
  );
}

export default ActionMenu;
