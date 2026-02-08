import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import './MainLayout.css';

function MainLayout({ user, onLogout, children }) {
  return (
    <div className="main-layout">
      <Header user={user} onLogout={onLogout} />
      <div className="main-body">
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
