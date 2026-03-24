import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', short: 'D' },
  { path: '/wishes', label: 'やりたいこと', short: 'や' },
  { path: '/accounting', label: 'Accounting', short: 'A' },
  { path: '/notes', label: 'Notes', short: 'N' },
  { path: '/knowledge', label: '📚 学習', short: '📚' },
  { path: '/tasks', label: '✅ タスク管理', short: '✅' },
  { path: '/settings', label: '⚙️ 設定', short: '⚙️' },
  { path: '/clawdbot', label: '🤖 Clawdbot Badge', short: '🤖' },
  { path: '/voice-test', label: '🎤 Voice Test', short: 'Mic' },
];

function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}>
        {collapsed ? '▶' : '◀'}
      </button>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
            title={item.label}
          >
            {collapsed ? item.short : item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
