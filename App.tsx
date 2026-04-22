import React, { useState, useEffect, useCallback } from 'react';
import { AuthPage } from './components/AuthPage';
import { LandingPage } from './components/LandingPage';
import { InstrumentPage } from './components/InstrumentPage';
import { SoundDesigner } from './components/SoundDesigner';
import { AuthUser } from './types';
import { loadSavedInstruments } from './engine/timbres';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'instrument' | 'designer'>('landing');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedCustomTimbre, setSelectedCustomTimbre] = useState<string | null>(null);

  // Load saved custom instruments on app boot so they're registered
  useEffect(() => {
    loadSavedInstruments();
  }, []);

  // On mount, check for existing JWT in localStorage
  useEffect(() => {
    const token = localStorage.getItem('cl_token');
    if (!token) {
      setAuthChecked(true);
      return;
    }

    // Verify token with backend
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then(data => {
        setUser(data.user);
      })
      .catch(() => {
        // Token expired or invalid — clear it
        localStorage.removeItem('cl_token');
      })
      .finally(() => setAuthChecked(true));
  }, []);

  const handleAuth = (authUser: AuthUser, token: string) => {
    localStorage.setItem('cl_token', token);
    setUser(authUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('cl_token');
    setUser(null);
    setView('landing');
  };

  const handleSelectCustomInstrument = useCallback((timbreKey: string) => {
    setSelectedCustomTimbre(timbreKey);
    setView('instrument');
  }, []);

  // Show nothing until we've checked auth status (prevents flash)
  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-ivory)',
      }}>
        <div className="auth-spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  // Not logged in → show auth page
  if (!user) {
    return <AuthPage onAuth={handleAuth} />;
  }

  // Logged in → show app
  if (view === 'designer') {
    return (
      <SoundDesigner
        onExit={() => setView('instrument')}
        user={user}
        onLogout={handleLogout}
        onSelectInstrument={handleSelectCustomInstrument}
      />
    );
  }

  if (view === 'instrument') {
    return (
      <InstrumentPage
        onExit={() => setView('landing')}
        onOpenDesigner={() => setView('designer')}
        user={user}
        onLogout={handleLogout}
        initialCustomTimbre={selectedCustomTimbre}
        onCustomTimbreConsumed={() => setSelectedCustomTimbre(null)}
      />
    );
  }

  return <LandingPage onLaunch={() => setView('instrument')} user={user} onLogout={handleLogout} />;
};

export default App;
