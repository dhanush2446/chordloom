import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AudioEngine } from '../engine/audioEngine';
import {
  CustomTimbreParams,
  DEFAULT_CUSTOM_PARAMS,
  SavedInstrument,
  loadSavedInstruments,
  saveInstrument,
  deleteInstrument,
  renameInstrument,
} from '../engine/timbres';
import { AuthUser } from '../types';
import { ProfileDropdown } from './ProfileDropdown';

// ── Parameter metadata for UI rendering ──────────────────────────
interface ParamMeta {
  key: keyof CustomTimbreParams | string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  format?: (v: number) => string;
}

const PARAM_GROUPS: { title: string; icon: string; description: string; params: ParamMeta[] }[] = [
  {
    title: 'Harmonics',
    icon: '🎵',
    description: 'Shape the harmonic overtone series — the DNA of your sound\'s character',
    params: [
      { key: 'h0', label: 'Fundamental', description: 'The root frequency — the core of your tone. Higher = louder base pitch.', min: 0, max: 1, step: 0.01, unit: '' },
      { key: 'h1', label: '2nd Harmonic', description: 'One octave above — adds fullness and warmth. Present in most natural sounds.', min: 0, max: 1, step: 0.01, unit: '' },
      { key: 'h2', label: '3rd Harmonic', description: 'Creates hollow, clarinet-like quality. Odd harmonics give a woodwind character.', min: 0, max: 1, step: 0.01, unit: '' },
      { key: 'h3', label: '4th Harmonic', description: 'Two octaves up — brightens the tone. More of this = more metallic sparkle.', min: 0, max: 1, step: 0.01, unit: '' },
      { key: 'h4', label: '5th Harmonic', description: 'Adds brass-like quality and edge. Key ingredient in trumpet-like timbres.', min: 0, max: 1, step: 0.01, unit: '' },
    ],
  },
  {
    title: 'Oscillators',
    icon: '〰️',
    description: 'Control the multi-oscillator ensemble — detuning creates chorus and width',
    params: [
      { key: 'detuneSpread', label: 'Detune Spread', description: 'How far apart the 3 oscillators are tuned (in cents). More spread = wider, richer chorus effect.', min: 0, max: 30, step: 0.5, unit: ' ct' },
      { key: 'oscBalance', label: 'Ensemble Balance', description: 'Mix between center oscillator and side pair. 0 = solo, 1 = full ensemble.', min: 0, max: 1, step: 0.01, unit: '' },
    ],
  },
  {
    title: 'Filter',
    icon: '🔉',
    description: 'Sculpt the frequency spectrum — filters shape brightness and body',
    params: [
      { key: 'lpFreq', label: 'Brightness', description: 'Lowpass filter cutoff — controls how bright or dark the sound is. Lower = muffled, higher = brilliant.', min: 500, max: 12000, step: 50, unit: ' Hz', format: (v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}` },
      { key: 'lpQ', label: 'Resonance', description: 'Filter resonance peak — adds a nasal, vowel-like quality. Higher values create a more pronounced \"wah\" effect.', min: 0.1, max: 5.0, step: 0.1, unit: '' },
      { key: 'hpFreq', label: 'Body', description: 'Highpass filter — removes low-end rumble. Higher values thin the sound, lower values add warmth.', min: 20, max: 300, step: 5, unit: ' Hz' },
    ],
  },
  {
    title: 'Vibrato',
    icon: '🌊',
    description: 'Natural pitch modulation — mimics the subtle hand tremor of real players',
    params: [
      { key: 'vibDepth', label: 'Depth', description: 'How wide the pitch wobbles (in cents). Subtle values (1-3) feel natural, higher values are dramatic.', min: 0, max: 10, step: 0.1, unit: ' ct' },
      { key: 'vibRate', label: 'Speed', description: 'How fast the vibrato oscillates (Hz). 4-6 Hz feels human, faster = nervous energy.', min: 0.5, max: 10, step: 0.1, unit: ' Hz' },
    ],
  },
  {
    title: 'Warmth',
    icon: '🔥',
    description: 'Tube-style saturation adds harmonic richness and analog character',
    params: [
      { key: 'saturation', label: 'Drive', description: 'Soft saturation amount — models vacuum tube distortion. Low = clean, high = warm, glowing overdrive.', min: 0, max: 1, step: 0.01, unit: '' },
    ],
  },
  {
    title: 'Tremolo',
    icon: '📳',
    description: 'Amplitude modulation — creates pulsing, trembling volume effects',
    params: [
      { key: 'tremoloRate', label: 'Rate', description: 'How fast the volume pulses (Hz). 0 = off. 3-5 Hz = organ-like, faster = electronic.', min: 0, max: 10, step: 0.1, unit: ' Hz' },
      { key: 'tremoloDepth', label: 'Depth', description: 'How dramatic the volume swings. 0 = no effect, 0.5 = extreme pulsing.', min: 0, max: 0.5, step: 0.01, unit: '' },
    ],
  },
  {
    title: 'Noise',
    icon: '💨',
    description: 'Add breath, bow rosin, or circuit noise for organic texture',
    params: [
      { key: 'noiseLevel', label: 'Amount', description: 'How much noise is mixed in. Subtle values add realism — bow scrape, air flow, circuit hiss.', min: 0, max: 0.1, step: 0.001, unit: '', format: (v) => `${(v * 100).toFixed(1)}%` },
      { key: 'noiseFilterFreq', label: 'Character', description: 'Shapes the noise color. Low = rumble/breath, mid = rosin, high = hiss/air.', min: 500, max: 8000, step: 100, unit: ' Hz', format: (v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}` },
    ],
  },
  {
    title: 'Reverb',
    icon: '🏛️',
    description: 'Concert hall ambience — places your instrument in acoustic space',
    params: [
      { key: 'reverbMix', label: 'Wet/Dry Mix', description: 'Blend between direct sound and reverb. 0 = bone-dry, 1 = cathedral wash.', min: 0, max: 1, step: 0.01, unit: '', format: (v) => `${Math.round(v * 100)}%` },
    ],
  },
];

// ── Helper to get/set nested harmonic params ─────────────────────
function getParamValue(params: CustomTimbreParams, key: string): number {
  if (key.startsWith('h') && key.length === 2) {
    const idx = parseInt(key[1]);
    return params.harmonics[idx];
  }
  return (params as any)[key] ?? 0;
}

function setParamValue(params: CustomTimbreParams, key: string, value: number): CustomTimbreParams {
  if (key.startsWith('h') && key.length === 2) {
    const idx = parseInt(key[1]);
    const newHarmonics = [...params.harmonics] as [number, number, number, number, number];
    newHarmonics[idx] = value;
    return { ...params, harmonics: newHarmonics };
  }
  return { ...params, [key]: value };
}

// ═══════════════════════════════════════════════════════════════
//  KNOB COMPONENT
// ═══════════════════════════════════════════════════════════════

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  unit: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  description: string;
}

const Knob: React.FC<KnobProps> = ({ value, min, max, step, label, unit, format, onChange, description }) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);
  const [showTooltip, setShowTooltip] = useState(false);

  const normalizedValue = (value - min) / (max - min);
  const angle = -135 + normalizedValue * 270; // -135° to +135°
  const arcLength = normalizedValue * 270;

  // SVG arc calculation
  const radius = 32;
  const cx = 40;
  const cy = 40;
  const startAngle = -225 * (Math.PI / 180);
  const endAngle = startAngle + arcLength * (Math.PI / 180);
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);
  const largeArc = arcLength > 180 ? 1 : 0;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dy = startY.current - e.clientY;
      const range = max - min;
      const sensitivity = e.shiftKey ? 400 : 150;
      let newVal = startVal.current + (dy / sensitivity) * range;
      newVal = Math.round(newVal / step) * step;
      newVal = Math.max(min, Math.min(max, newVal));
      onChange(newVal);
    };

    const handleMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const displayVal = format ? format(value) : (
    step < 0.1 ? value.toFixed(2) :
    step < 1 ? value.toFixed(1) :
    Math.round(value).toString()
  );

  return (
    <div className="sd-knob-container">
      <div
        className="sd-knob"
        ref={knobRef}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        tabIndex={0}
      >
        <svg width="80" height="80" viewBox="0 0 80 80">
          {/* Background track */}
          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(176,125,84,0.15)" strokeWidth="4"
            strokeDasharray={`${270 * (Math.PI * 32 * 2) / 360}`}
            strokeDashoffset={`${90 * (Math.PI * 32 * 2) / 360}`}
            strokeLinecap="round"
            transform="rotate(135 40 40)"
          />
          {/* Active arc */}
          {arcLength > 0.5 && (
            <path
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none"
              stroke="url(#knobGradient)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          )}
          {/* Indicator dot */}
          <circle
            cx={x2}
            cy={y2}
            r="4"
            fill="var(--color-gold)"
            filter="url(#knobGlow)"
          />
          {/* Gradient defs */}
          <defs>
            <linearGradient id="knobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-gold-light)" />
              <stop offset="100%" stopColor="var(--color-gold)" />
            </linearGradient>
            <filter id="knobGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
        </svg>
        <div className="sd-knob-value">{displayVal}{!format && unit}</div>
      </div>
      <div className="sd-knob-label">{label}</div>
      {showTooltip && (
        <div className="sd-knob-tooltip">{description}</div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  WAVEFORM PREVIEW CANVAS
// ═══════════════════════════════════════════════════════════════

const WaveformPreview: React.FC<{ params: CustomTimbreParams }> = ({ params }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 480;
    const h = 200;
    canvas.width = w;
    canvas.height = h;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.strokeStyle = 'rgba(176,125,84,0.08)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      // Center line
      ctx.strokeStyle = 'rgba(201,168,76,0.15)';
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Draw the waveform from harmonics
      ctx.beginPath();
      const baseFreq = 2; // visual cycles across canvas
      for (let x = 0; x < w; x++) {
        const phase = (x / w) * Math.PI * 2 * baseFreq + t * 0.001;
        let y = 0;
        for (let i = 0; i < 5; i++) {
          y += params.harmonics[i] * Math.sin(phase * (i + 1));
        }
        // Normalize
        const maxAmp = params.harmonics.reduce((s, v) => s + v, 0) || 1;
        y = (y / maxAmp) * (h * 0.35);
        const py = h / 2 - y;
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }

      // Gold gradient stroke
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, 'rgba(201,168,76,0.3)');
      grad.addColorStop(0.3, 'rgba(226,196,106,0.9)');
      grad.addColorStop(0.7, 'rgba(201,168,76,0.9)');
      grad.addColorStop(1, 'rgba(201,168,76,0.3)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Glow pass
      ctx.shadowColor = 'rgba(201,168,76,0.4)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [params.harmonics]);

  return (
    <div className="sd-waveform-preview">
      <canvas ref={canvasRef} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  MAIN SOUND DESIGNER PAGE
// ═══════════════════════════════════════════════════════════════

interface Props {
  onExit: () => void;
  user: AuthUser;
  onLogout: () => void;
  onSelectInstrument?: (timbreKey: string) => void;
}

export const SoundDesigner: React.FC<Props> = ({ onExit, user, onLogout, onSelectInstrument }) => {
  const [params, setParams] = useState<CustomTimbreParams>({ ...DEFAULT_CUSTOM_PARAMS });
  const [savedInstruments, setSavedInstruments] = useState<SavedInstrument[]>([]);
  const [activeInstrumentId, setActiveInstrumentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewFreq, setPreviewFreq] = useState(440);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Settings state (same as InstrumentPage)
  const [settings, setSettings] = useState({
    octaveSpan: 0.5,
    pitchExponent: 1.2,
  });

  const audioRef = useRef<AudioEngine | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init audio engine for preview
  useEffect(() => {
    const audio = new AudioEngine();
    audio.init();
    audioRef.current = audio;
    return () => { audio.dispose(); audioRef.current = null; };
  }, []);

  // Load saved instruments on mount
  useEffect(() => {
    const instruments = loadSavedInstruments();
    setSavedInstruments(instruments);
  }, []);

  const handleParamChange = useCallback((key: string, value: number) => {
    setParams(prev => {
      const next = setParamValue(prev, key, value);
      // Live update preview if playing
      if (audioRef.current && isPlaying) {
        audioRef.current.updatePreview(next, previewFreq);
      }
      return next;
    });
  }, [isPlaying, previewFreq]);

  const stopPreview = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (audioRef.current) audioRef.current.stopPreview();
    setIsPlaying(false);
  }, []);

  const togglePreview = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      stopPreview();
    } else {
      audioRef.current.startPreview(params, previewFreq);
      setIsPlaying(true);
      // Auto-stop after 5 seconds
      previewTimerRef.current = setTimeout(() => {
        stopPreview();
      }, 5000);
    }
  }, [isPlaying, params, previewFreq, stopPreview]);

  // Stop preview on unmount
  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      if (audioRef.current) audioRef.current.stopPreview();
    };
  }, []);

  const handleSave = useCallback(() => {
    const id = activeInstrumentId || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const instrument: SavedInstrument = {
      id,
      params: { ...params },
      createdAt: Date.now(),
    };
    const updated = saveInstrument(instrument);
    setSavedInstruments(updated);
    setActiveInstrumentId(id);
  }, [params, activeInstrumentId]);

  const handleLoad = useCallback((inst: SavedInstrument) => {
    setParams({ ...inst.params });
    setActiveInstrumentId(inst.id);
    if (audioRef.current && isPlaying) {
      audioRef.current.updatePreview(inst.params, previewFreq);
    }
  }, [isPlaying, previewFreq]);

  const handleDelete = useCallback((id: string) => {
    const updated = deleteInstrument(id);
    setSavedInstruments(updated);
    if (activeInstrumentId === id) {
      setActiveInstrumentId(null);
      setParams({ ...DEFAULT_CUSTOM_PARAMS });
    }
    setMenuOpen(null);
  }, [activeInstrumentId]);

  const handleRename = useCallback((id: string, newName: string) => {
    const updated = renameInstrument(id, newName);
    setSavedInstruments(updated);
    setEditingName(null);
  }, []);

  const handleUseInInstrument = useCallback((id: string) => {
    onSelectInstrument?.(id);
    setMenuOpen(null);
  }, [onSelectInstrument]);

  const toggleGroup = useCallback((index: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleResetParams = useCallback(() => {
    setParams({ ...DEFAULT_CUSTOM_PARAMS });
    setActiveInstrumentId(null);
    if (audioRef.current && isPlaying) {
      audioRef.current.updatePreview(DEFAULT_CUSTOM_PARAMS, previewFreq);
    }
  }, [isPlaying, previewFreq]);

  const previewNotes = [
    { label: 'C3', freq: 130.81 },
    { label: 'A3', freq: 220 },
    { label: 'A4', freq: 440 },
    { label: 'C5', freq: 523.25 },
    { label: 'A5', freq: 880 },
  ];

  return (
    <div className="sd-page">
      {/* ── Top Bar ── */}
      <div className="instrument-topbar">
        <div className="nav-logo" style={{ gap: 8 }}>
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="18" fill="url(#tLogo2)" />
            <path d="M8 18c2-4 4-8 6-4s4 8 6 2 4-10 6-4 2 6 2 6" stroke="#FFF8F0" strokeWidth="2" strokeLinecap="round" fill="none" />
            <defs><linearGradient id="tLogo2" x1="0" y1="0" x2="36" y2="36"><stop offset="0%" stopColor="#E2C46A" /><stop offset="100%" stopColor="#A0722A" /></linearGradient></defs>
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-mahogany)' }}>Sound Designer</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ProfileDropdown user={user} onLogout={onLogout} style={{ marginRight: 8 }} />
          <button className="btn-icon" onClick={onExit} aria-label="Back to instruments" title="Back to Instrument">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
        </div>
      </div>

      {/* ── Left Panel: Parameter Controls ── */}
      <div className="sd-panel sd-panel-left">
        <div className="sd-panel-header">
          <div className="panel-section-label">Parameters</div>
          <button className="sd-reset-btn" onClick={handleResetParams} title="Reset all parameters to defaults">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            Reset
          </button>
        </div>

        <div className="sd-params-scroll">
          {PARAM_GROUPS.map((group, gi) => (
            <div key={gi} className={`sd-group ${expandedGroups.has(gi) ? 'expanded' : ''}`}>
              <button className="sd-group-header" onClick={() => toggleGroup(gi)}>
                <span className="sd-group-icon">{group.icon}</span>
                <span className="sd-group-title">{group.title}</span>
                <svg className="sd-group-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              {expandedGroups.has(gi) && (
                <div className="sd-group-content">
                  <p className="sd-group-desc">{group.description}</p>
                  <div className="sd-knobs-row">
                    {group.params.map((pm) => (
                      <Knob
                        key={pm.key}
                        value={getParamValue(params, pm.key)}
                        min={pm.min}
                        max={pm.max}
                        step={pm.step}
                        label={pm.label}
                        unit={pm.unit}
                        format={pm.format}
                        description={pm.description}
                        onChange={(v) => handleParamChange(pm.key, v)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Center: Waveform Preview ── */}
      <div className="sd-center">
        <div className="sd-preview-card">
          <div className="sd-preview-header">
            <div className="panel-section-label">Live Preview</div>
            <div className="sd-preview-name">
              <input
                type="text"
                value={params.name}
                onChange={(e) => setParams(p => ({ ...p, name: e.target.value }))}
                className="sd-name-input"
                placeholder="Name your sound..."
              />
            </div>
          </div>

          <WaveformPreview params={params} />

          <div className="sd-preview-controls">
            <button
              className={`sd-play-btn ${isPlaying ? 'playing' : ''}`}
              onClick={togglePreview}
              aria-label={isPlaying ? 'Stop preview' : 'Play preview'}
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              )}
              {isPlaying ? 'Stop' : 'Preview'}
            </button>
            <div className="sd-note-selector">
              {previewNotes.map(n => (
                <button
                  key={n.label}
                  className={`sd-note-btn ${previewFreq === n.freq ? 'active' : ''}`}
                  onClick={() => {
                    setPreviewFreq(n.freq);
                    if (audioRef.current && isPlaying) {
                      audioRef.current.updatePreview(params, n.freq);
                    }
                  }}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sd-action-row">
            <button className="btn-gold sd-save-btn" onClick={handleSave}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
              {activeInstrumentId ? 'Update Instrument' : 'Save as Instrument'}
            </button>
            {activeInstrumentId && (
              <button className="sd-new-btn" onClick={() => { setActiveInstrumentId(null); setParams(p => ({ ...p, name: 'My Sound ' + (savedInstruments.length + 1) })); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                New
              </button>
            )}
          </div>
        </div>

        {/* Settings Section */}
        <div className="sd-settings-card">
          <div className="panel-section-label">General Settings</div>
          <div className="sd-settings-grid">
            <div className="sd-setting-item">
              <div className="sd-setting-header">
                <span>Octave Span</span>
                <span className="sd-setting-value">{Math.round(settings.octaveSpan * 100)}%</span>
              </div>
              <input type="range" min="0.2" max="1.0" step="0.05" value={settings.octaveSpan}
                onChange={(e) => setSettings(s => ({ ...s, octaveSpan: parseFloat(e.target.value) }))}
                className="sd-slider" />
              <p className="sd-setting-desc">How much of the camera frame maps to octave selection. Wider = easier but less precise.</p>
            </div>
            <div className="sd-setting-item">
              <div className="sd-setting-header">
                <span>Pitch Responsiveness</span>
                <span className="sd-setting-value">{settings.pitchExponent.toFixed(1)}</span>
              </div>
              <input type="range" min="0.5" max="3.0" step="0.1" value={settings.pitchExponent}
                onChange={(e) => setSettings(s => ({ ...s, pitchExponent: parseFloat(e.target.value) }))}
                className="sd-slider" />
              <p className="sd-setting-desc">Pitch mapping curve exponent. Higher = more sensitivity near the camera.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel: My Instruments Library ── */}
      <div className="sd-panel sd-panel-right">
        <div className="panel-section-label">My Instruments</div>
        <p className="sd-library-desc">Your custom-crafted sounds. Select one to load its parameters or use it in the theremin.</p>

        {savedInstruments.length === 0 ? (
          <div className="sd-empty-library">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(176,125,84,0.3)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            <p>No custom instruments yet</p>
            <p className="sd-empty-sub">Use the parameters to craft a sound, then save it here</p>
          </div>
        ) : (
          <div className="sd-library-list">
            {savedInstruments.map((inst) => (
              <div
                key={inst.id}
                className={`sd-instrument-card ${activeInstrumentId === inst.id ? 'active' : ''}`}
                onClick={() => handleLoad(inst)}
              >
                <div className="sd-instrument-info">
                  {editingName === inst.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onBlur={() => { handleRename(inst.id, editNameValue); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(inst.id, editNameValue); }}
                      className="sd-rename-input"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <div className="sd-instrument-name">
                        {activeInstrumentId === inst.id && <span className="sd-active-dot" />}
                        {inst.params.name}
                      </div>
                      <div className="sd-instrument-date">
                        {new Date(inst.createdAt).toLocaleDateString()}
                      </div>
                    </>
                  )}
                </div>
                <div className="sd-instrument-actions">
                  <button
                    className="sd-menu-btn"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === inst.id ? null : inst.id); }}
                    aria-label="Options"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                  </button>
                  {menuOpen === inst.id && (
                    <div className="sd-dropdown">
                      <button onClick={(e) => { e.stopPropagation(); handleUseInInstrument(inst.id); }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                        Use in Theremin
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingName(inst.id); setEditNameValue(inst.params.name); setMenuOpen(null); }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        Rename
                      </button>
                      <button className="sd-delete-opt" onClick={(e) => { e.stopPropagation(); handleDelete(inst.id); }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {savedInstruments.length > 0 && (
          <>
            <div className="panel-divider" />
            <div className="panel-section-label">Active in Theremin</div>
            <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--color-cedar)' }}>
              {activeInstrumentId
                ? savedInstruments.find(i => i.id === activeInstrumentId)?.params.name || 'Custom'
                : 'None selected — use the ⋮ menu to assign'}
            </p>
          </>
        )}
      </div>
    </div>
  );
};
