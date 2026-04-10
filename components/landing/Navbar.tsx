import React, { useState, useEffect } from 'react';

import { AuthUser } from '../../types';
import { ProfileDropdown } from '../ProfileDropdown';

interface Props {
  onLaunch: () => void;
  user: AuthUser;
  onLogout: () => void;
}

const WaveLogo = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="18" fill="url(#logoGrad)" />
    <path d="M8 18c2-4 4-8 6-4s4 8 6 2 4-10 6-4 2 6 2 6" stroke="#FFF8F0" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="36" y2="36">
        <stop offset="0%" stopColor="#E2C46A" />
        <stop offset="100%" stopColor="#A0722A" />
      </linearGradient>
    </defs>
  </svg>
);

export const Navbar: React.FC<Props> = ({ onLaunch, user, onLogout }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <nav className={`nav-main ${scrolled ? 'scrolled' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="nav-logo">
        <WaveLogo />
        <div>
          <span className="nav-logo-text">Chord Loom</span>
          <span className="nav-logo-tagline" style={{ marginLeft: 8 }}>Virtual Theremin</span>
        </div>
      </div>

      <div className="nav-links">
        <button className="nav-link" onClick={() => scrollTo('features')}>Instrument</button>
        <button className="nav-link" onClick={() => scrollTo('how-it-works')}>How It Works</button>
        <button className="nav-link" onClick={() => scrollTo('gallery')}>Gallery</button>
        <button className="nav-link" onClick={() => scrollTo('cta')}>About</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Mobile hamburger */}
        <button
          className="btn-icon"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          style={{ display: 'none' }}
          id="mobile-menu-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>

        <button className="btn-gold" onClick={onLaunch} id="launch-btn">
          Launch Instrument
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
        
        <ProfileDropdown user={user} onLogout={onLogout} />
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 72, left: 0, right: 0, bottom: 0,
          background: 'rgba(250,247,240,0.97)', backdropFilter: 'blur(20px)',
          zIndex: 999, padding: '48px 32px', display: 'flex', flexDirection: 'column', gap: 24
        }}>
          <button className="nav-link" onClick={() => scrollTo('features')} style={{ fontSize: '1.2rem' }}>Instrument</button>
          <button className="nav-link" onClick={() => scrollTo('how-it-works')} style={{ fontSize: '1.2rem' }}>How It Works</button>
          <button className="nav-link" onClick={() => scrollTo('gallery')} style={{ fontSize: '1.2rem' }}>Gallery</button>
          <button className="nav-link" onClick={() => scrollTo('cta')} style={{ fontSize: '1.2rem' }}>About</button>
          <button className="btn-gold btn-gold-lg" onClick={() => { setMenuOpen(false); onLaunch(); }} style={{ marginTop: 16 }}>
            Launch Instrument
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 1023px) {
          #mobile-menu-btn { display: flex !important; }
          #launch-btn { display: none; }
        }
      `}</style>
    </nav>
  );
};
