import React from 'react';
import './Header.css';

function Header({ user, onLogout }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <span className="header-title">Reflexio</span>
      </div>
      <div className="header-right">
        <span className="header-user">{user?.displayName || user?.username}</span>
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;
