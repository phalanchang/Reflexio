import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/wishes', label: 'やりたいこと' },
  { path: '/accounting', label: 'Accounting' },
  { path: '/notes', label: 'Notes' },
  { path: '/active-recall', label: 'ActiveRecall' },
  { path: '/tasks', label: 'Task Management' },
  { path: '/settings', label: '⚙️ 設定' },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
