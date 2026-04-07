import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-col">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="url(#fLogo)" />
              <path d="M8 18c2-4 4-8 6-4s4 8 6 2 4-10 6-4 2 6 2 6" stroke="#FFF8F0" strokeWidth="2" strokeLinecap="round" fill="none" />
              <defs><linearGradient id="fLogo" x1="0" y1="0" x2="36" y2="36"><stop offset="0%" stopColor="#E2C46A" /><stop offset="100%" stopColor="#A0722A" /></linearGradient></defs>
            </svg>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-gold-pale)' }}>Chord Loom</span>
          </div>
          <p>
            A virtual theremin crafted with the same love and attention to detail
            that goes into the real instrument. Built with Web Audio API and MediaPipe hand tracking.
          </p>
        </div>

        <div className="footer-col">
          <h4>Navigate</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <a href="#hero">Home</a>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#timbres">Timbres</a>
            <a href="#gallery">Gallery</a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Instrument</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <a href="#features">Gesture Control</a>
            <a href="#features">Pitch System</a>
            <a href="#timbres">Timbre Library</a>
            <a href="#features">Octave Select</a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Connect</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="#cta">Get Started</a>
          </div>
        </div>
      </div>

      <div className="footer-divider" />

      <div className="footer-bottom">
        <span>© 2026 Chord Loom. All rights reserved.</span>
        <span>Built with Web Audio API and MediaPipe</span>
      </div>
    </footer>
  );
};
