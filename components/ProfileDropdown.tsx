import React, { useState, useRef, useEffect } from 'react';
import { AuthUser } from '../types';
import { RecordingsModal } from './RecordingsModal';

interface Props {
  user: AuthUser;
  onLogout: () => void;
  style?: React.CSSProperties;
}

export const ProfileDropdown: React.FC<Props> = ({ user, onLogout, style }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click (only if recordings modal is not open)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (showRecordings) return; // Don't close if modal is open
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isOpen, showRecordings]);

  // Derive initials
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  return (
    <div style={{ position: 'relative', ...style }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-gold-light), var(--color-gold))',
          color: 'var(--color-mahogany)', fontFamily: 'var(--font-ui)', fontWeight: 700,
          border: '2px solid rgba(250,247,240,0.5)', cursor: 'pointer',
          boxShadow: 'var(--shadow-gold-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
        aria-label="Profile menu"
      >
        {initials}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 240, background: 'rgba(250,247,240,0.95)',
          backdropFilter: 'blur(20px)', border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 'var(--radius-lg)', padding: '16px',
          boxShadow: 'var(--shadow-xl)', zIndex: 9999,
          animation: 'slideDown 200ms cubic-bezier(0.2,0.8,0.2,1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
             <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-gold-light), var(--color-gold))',
                color: 'var(--color-mahogany)', fontFamily: 'var(--font-ui)', fontWeight: 700,
                fontSize: '1.2rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {initials}
             </div>
             <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-mahogany)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user.name}
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--color-cedar)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user.email}
                </div>
             </div>
          </div>
          
          <div style={{ height: 1, background: 'rgba(201, 168, 76, 0.2)', margin: '0 -16px 16px -16px' }} />
          
          <button 
            onClick={() => { setIsOpen(false); setShowRecordings(true); }}
            style={{
              width: '100%', padding: '10px 16px', background: 'transparent',
              color: 'var(--color-mahogany)', borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 150ms', marginBottom: 8,
              border: '1px solid var(--color-gold)'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(201,168,76,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            My Recordings
          </button>

          <button 
            onClick={onLogout}
            style={{
              width: '100%', padding: '10px 16px', background: 'rgba(125,28,58,0.05)',
              color: 'var(--color-burgundy)', borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 150ms'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(125,28,58,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(125,28,58,0.05)'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      )}

      {showRecordings && (
        <RecordingsModal onClose={() => setShowRecordings(false)} />
      )}
    </div>
  );
};
