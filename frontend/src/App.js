import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';
import WishList from './components/WishList';
import GoogleCallback from './components/GoogleCallback';
import Settings from './components/Settings';
import ClawdbotSkills from './components/ClawdbotSkills';
import VoiceTest from './components/VoiceTest';
import KnowledgeList from './components/KnowledgeList';
import KnowledgeForm from './components/KnowledgeForm';
import KnowledgeDetail from './components/KnowledgeDetail';
import { ToastProvider } from './components/Toast';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        // Not logged in
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <ToastProvider>
    <div className="App">
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginForm onLogin={handleLogin} />}
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute user={user}>
              <MainLayout user={user} onLogout={handleLogout}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/wishes" element={<WishList />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/clawdbot" element={<ClawdbotSkills />} />
                  <Route path="/knowledge" element={<KnowledgeList />} />
                  <Route path="/knowledge/new" element={<KnowledgeForm />} />
                  <Route path="/knowledge/:id" element={<KnowledgeDetail />} />
                  <Route path="/knowledge/:id/edit" element={<KnowledgeForm />} />
                  <Route path="/voice-test" element={<VoiceTest />} />
                  <Route path="/auth/google/callback" element={<GoogleCallback />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
    </ToastProvider>
  );
}

export default App;
