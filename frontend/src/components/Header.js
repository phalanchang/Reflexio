import React from 'react';
import TaskBadge from './TaskBadge';
import './Header.css';

function Header({ user, onLogout, theme, onThemeToggle }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <span className="header-title">Reflexio</span>
      </div>
      <div className="header-right">
        <TaskBadge />
        <button className="theme-toggle" onClick={onThemeToggle} title={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <span className="header-user">{user?.displayName || user?.username}</span>
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;
