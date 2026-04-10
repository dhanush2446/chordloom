import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ThereminCore } from './ThereminCore';
import { TIMBRE_PROFILES, TIMBRE_KEYS, TimbreKey } from '../engine/timbres';
import { GestureState } from '../engine/gestureState';

interface Props {
  onExit: () => void;
}

export const InstrumentPage: React.FC<Props> = ({ onExit }) => {
  const [stats, setStats] = useState({
    freq: 0, vol: 0, note: '',
    gestureState: GestureState.INACTIVE as GestureState,
    octaveBand: '', pinchDist: 0,
  });
  const [timbre, setTimbre] = useState<TimbreKey>('warmTheremin');
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    octaveSpan: 0.5,
    pitchExponent: 1.2,
  });

  const handleUpdate = useCallback((
    freq: number, vol: number, note: string,
    gestureState: GestureState, octaveBand: string, pinchDist: number,
  ) => {
    setStats({
      freq: Math.round(freq),
      vol: parseFloat(vol.toFixed(2)),
      note, gestureState, octaveBand,
      pinchDist: Math.round(pinchDist),
    });
  }, []);

  // Waveform monitor
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveAnimRef = useRef(0);

  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 320;
    canvas.height = 120;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, 320, 120);
      ctx.beginPath();
      const vol = stats.vol;
      const freq = stats.freq || 220;
      for (let x = 0; x < 320; x++) {
        const nx = x / 320;
        const y = 60 + Math.sin(nx * Math.PI * 2 * (freq / 80) + t * 0.005) * 25 * vol;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#C9A84C';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      waveAnimRef.current = requestAnimationFrame(draw);
    };
    waveAnimRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(waveAnimRef.current);
  }, [stats.freq, stats.vol]);

  const volSegments = 20;
  const litCount = Math.round(stats.vol * volSegments);

  const stateInfo: Record<GestureState, { label: string; cls: string; dot: string }> = {
    [GestureState.INACTIVE]: { label: 'NO HAND', cls: 'cut', dot: '○' },
    [GestureState.CUT]: { label: 'SILENT', cls: 'silent', dot: '○' },
    [GestureState.ACTIVE]: { label: 'PLAYING', cls: 'playing', dot: '●' },
    [GestureState.FLICK_LOCK]: { label: 'CUT', cls: 'cut', dot: '⚡' },
  };

  const si = stateInfo[stats.gestureState] || stateInfo[GestureState.INACTIVE];

  return (
    <div className="instrument-page">
      {/* ── Top Bar ── */}
      <div className="instrument-topbar">
        <div className="nav-logo" style={{ gap: 8 }}>
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="18" fill="url(#tLogo)" />
            <path d="M8 18c2-4 4-8 6-4s4 8 6 2 4-10 6-4 2 6 2 6" stroke="#FFF8F0" strokeWidth="2" strokeLinecap="round" fill="none" />
            <defs><linearGradient id="tLogo" x1="0" y1="0" x2="36" y2="36"><stop offset="0%" stopColor="#E2C46A" /><stop offset="100%" stopColor="#A0722A" /></linearGradient></defs>
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-mahogany)' }}>Chord Loom</span>
        </div>



        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-icon" onClick={() => setShowSettings(!showSettings)} aria-label="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </button>
          <button className="btn-icon" onClick={() => setShowHelp(true)} aria-label="Help">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
          </button>
          <button className="btn-icon" onClick={onExit} aria-label="Exit to home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* ── Left Panel ── */}
      <div className="side-panel side-panel-left">
        <div className="panel-section-label">Timbre</div>
        {TIMBRE_KEYS.map((key) => (
          <button
            key={key}
            className={`inst-timbre-btn ${timbre === key ? 'active' : ''}`}
            onClick={() => setTimbre(key)}
            aria-pressed={timbre === key}
          >
            {TIMBRE_PROFILES[key].label}
          </button>
        ))}
        {timbre && (
          <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--color-cedar)', marginTop: 8 }}>
            {TIMBRE_PROFILES[timbre].description}
          </p>
        )}

        <div className="panel-divider" />

        <div className="panel-section-label">Octave</div>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-gold)' }}>
            {stats.octaveBand || '—'}
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="side-panel side-panel-right">
        <div className="panel-section-label">Pitch</div>
        <div className={`state-badge ${si.cls}`} aria-live="polite">
          {si.cls === 'playing' && <span className="dot" />}
          <span>{si.dot} {si.label}</span>
        </div>

        <div className="panel-divider" />

        <div className="panel-section-label">Volume</div>
        <div className="volume-meter">
          {Array.from({ length: volSegments }).map((_, i) => (
            <div key={i} className={`volume-segment ${i < litCount ? 'lit' : ''}`} />
          ))}
        </div>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', color: 'var(--color-cedar)', marginTop: 4 }}>
          {Math.round(stats.vol * 100)}%
        </div>

        <div className="panel-divider" />

        <div className="panel-section-label">Waveform</div>
        <div className="waveform-monitor">
          <canvas ref={waveCanvasRef} />
        </div>

        {showSettings && (
          <>
            <div className="panel-divider" />
            <div className="panel-section-label">Settings</div>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', color: 'var(--color-cedar)', marginBottom: '12px' }}>
              Adjust visual bounds and response sensitivity.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-cedar)', marginBottom: '4px' }}>
                  <span>Octave Span</span>
                  <span>{Math.round(settings.octaveSpan * 100)}%</span>
                </div>
                <input type="range" min="0.2" max="1.0" step="0.05" value={settings.octaveSpan} onChange={(e) => setSettings(s => ({ ...s, octaveSpan: parseFloat(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--color-gold)' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-cedar)', marginBottom: '4px' }}>
                  <span>Pitch Responsiveness</span>
                  <span>{settings.pitchExponent.toFixed(1)}</span>
                </div>
                <input type="range" min="0.5" max="3.0" step="0.1" value={settings.pitchExponent} onChange={(e) => setSettings(s => ({ ...s, pitchExponent: parseFloat(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--color-gold)' }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Main Playing Area ── */}
      <div className="playing-area">
        <ThereminCore onUpdate={handleUpdate} timbre={timbre} settings={settings} />
      </div>

      {/* ── Bottom Note Card ── */}
      <div className="note-card" style={{ animation: stats.gestureState === GestureState.ACTIVE ? 'noteGlow 2s ease-in-out infinite' : 'none' }}>
        <div>
          <div className="current-note">{stats.note || '—'}</div>
          <div className="current-freq">{stats.freq ? `${stats.freq} Hz` : 'No signal'}</div>
        </div>
        <div className={`state-badge ${si.cls}`} style={{ width: 'auto', padding: '4px 12px', fontSize: '0.7rem' }}>
          {si.label}
        </div>
      </div>

      {/* ── Help Overlay ── */}
      {showHelp && (
        <div className="help-overlay">
          <div className="help-overlay-bg" onClick={() => setShowHelp(false)} />
          <div className="help-modal" role="dialog" aria-label="How to Play">
            <h2>How to Play</h2>

            <div className="help-gesture-card">
              <h3>🤏 The Pinch Gate</h3>
              <p>Pinch your thumb and index finger together to start a note. Release to silence it. This is your primary on/off control.</p>
            </div>
            <div className="help-gesture-card">
              <h3>↕ Depth → Pitch</h3>
              <p>Push your right hand toward the camera for higher pitch, pull away for lower. Five octaves of continuous control.</p>
            </div>
            <div className="help-gesture-card">
              <h3>🖐️ Three Fingers → Volume</h3>
              <p>While pinching, move your middle, ring, and pinky fingers up for louder, down for quieter.</p>
            </div>
            <div className="help-gesture-card">
              <h3>⚡ Flick → Staccato</h3>
              <p>While playing, flick your three fingers downward fast for an instant staccato cut.</p>
            </div>
            <div className="help-gesture-card">
              <h3>🎵 Left Hand → Octave</h3>
              <p>Raise or lower your left hand to select the octave register.</p>
            </div>

            <table style={{ width: '100%', marginTop: 24, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-oak)', color: 'var(--color-cedar)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 500 }}>Gesture</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 500 }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Pinch close', 'Note on'],
                  ['Pinch open', 'Note off'],
                  ['Push closer', 'Higher pitch'],
                  ['Pull away', 'Lower pitch'],
                  ['Fingers up', 'Louder'],
                  ['Fingers down', 'Quieter'],
                  ['Fast flick down', 'Staccato cut'],
                  ['Left hand high', 'High octave'],
                  ['Left hand low', 'Low octave'],
                ].map(([g, r], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(176,125,84,0.1)' }}>
                    <td style={{ padding: '6px 0', color: 'var(--color-mahogany)' }}>{g}</td>
                    <td style={{ padding: '6px 0', color: 'var(--color-walnut)' }}>{r}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button className="btn-gold" onClick={() => setShowHelp(false)} style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}>
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
