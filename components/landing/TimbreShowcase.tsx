import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TIMBRE_PROFILES, TIMBRE_KEYS, TimbreKey } from '../../engine/timbres';

export const TimbreShowcase: React.FC = () => {
  const [active, setActive] = useState<TimbreKey>('pureSine');
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  // Draw waveform for active timbre
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const profile = TIMBRE_PROFILES[active];
    const harmonics = profile.harmonics;

    const draw = (t: number) => {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Draw composite wave
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, 'rgba(201,168,76,0.2)');
      grad.addColorStop(0.5, 'rgba(201,168,76,0.8)');
      grad.addColorStop(1, 'rgba(201,168,76,0.2)');

      ctx.beginPath();
      for (let x = 0; x <= w; x += 1) {
        const nx = x / w;
        let y = 0;
        for (let i = 1; i < harmonics.length; i++) {
          y += harmonics[i] * Math.sin(nx * Math.PI * 2 * i + t * 0.001 * i * 0.3);
        }
        // Normalize
        const maxAmp = harmonics.reduce((a, b) => a + Math.abs(b), 0) || 1;
        y = (y / maxAmp) * h * 0.35;
        const envelope = Math.sin(nx * Math.PI);
        if (x === 0) ctx.moveTo(x, h / 2 + y * envelope);
        else ctx.lineTo(x, h / 2 + y * envelope);
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Glow
      ctx.globalAlpha = 0.3;
      ctx.filter = 'blur(6px)';
      ctx.stroke();
      ctx.filter = 'none';
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(draw);
    };

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = 200 * window.devicePixelRatio;
    };
    resize();
    animRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  const playPreview = useCallback(async () => {
    if (isPlaying) return;
    setIsPlaying(true);

    try {
      const ctx = new AudioContext();
      const profile = TIMBRE_PROFILES[active];
      const n = profile.harmonics.length;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);
      for (let i = 0; i < n; i++) imag[i] = profile.harmonics[i];
      const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });

      // C major arpeggio: C4, E4, G4, C5
      const notes = [261.63, 329.63, 392.00, 523.25];
      const noteDur = 0.6;

      for (let i = 0; i < notes.length; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.setPeriodicWave(wave);
        osc.frequency.value = notes[i];
        osc.connect(gain);
        gain.connect(ctx.destination);

        const start = ctx.currentTime + i * noteDur;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.25, start + 0.05);
        gain.gain.setValueAtTime(0.25, start + noteDur - 0.15);
        gain.gain.linearRampToValueAtTime(0, start + noteDur);

        osc.start(start);
        osc.stop(start + noteDur);
      }

      setTimeout(() => {
        ctx.close();
        setIsPlaying(false);
      }, notes.length * noteDur * 1000 + 200);
    } catch {
      setIsPlaying(false);
    }
  }, [active, isPlaying]);

  return (
    <section className="timbre-section" id="timbres">
      <div className="section-header">
        <p className="eyebrow">Timbres</p>
        <h2>Eleven Voices</h2>
        <p>One instrument, eleven distinct characters — each shaped by its unique harmonic fingerprint.</p>
      </div>

      <div className="timbre-card">
        <div className="timbre-list">
          {TIMBRE_KEYS.map((key) => (
            <button
              key={key}
              className={`timbre-item ${active === key ? 'active' : ''}`}
              onClick={() => setActive(key)}
              aria-pressed={active === key}
            >
              {TIMBRE_PROFILES[key].label}
            </button>
          ))}
        </div>
        <div className="timbre-preview">
          <div style={{ width: '100%', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-heading-md)', color: 'var(--color-mahogany)', marginBottom: 4 }}>
              {TIMBRE_PROFILES[active].label}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: 'var(--text-body-sm)', color: 'var(--color-cedar)' }}>
              {TIMBRE_PROFILES[active].description}
            </p>
          </div>
          <canvas ref={canvasRef} style={{ width: '100%', height: 200 }}/>
          <button
            className="btn-gold"
            onClick={playPreview}
            disabled={isPlaying}
            aria-label={`Preview ${TIMBRE_PROFILES[active].label} sound`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
            {isPlaying ? 'Playing...' : 'Preview Sound'}
          </button>
        </div>
      </div>
    </section>
  );
};
