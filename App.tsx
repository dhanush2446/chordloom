import React, { useState, useCallback } from 'react';
import { ThereminCore } from './components/ThereminCore';
import { TIMBRE_PROFILES, TIMBRE_KEYS, TimbreKey } from './engine/timbres';
import { GestureState } from './engine/gestureState';
import {
  Waves, Music, Volume2, HelpCircle,
  LogOut, Hand
} from 'lucide-react';

const App: React.FC = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [stats, setStats] = useState({
    freq: 0, vol: 0, note: '',
    gestureState: GestureState.INACTIVE as GestureState,
    octaveBand: '',
    pinchDist: 0,
  });
  const [showInfo, setShowInfo] = useState(false);
  const [timbre, setTimbre] = useState<TimbreKey>('warmTheremin');

  const handleUpdate = useCallback((
    freq: number, vol: number, note: string,
    gestureState: GestureState, octaveBand: string, pinchDist: number,
  ) => {
    setStats({
      freq: Math.round(freq),
      vol: parseFloat(vol.toFixed(2)),
      note,
      gestureState,
      octaveBand,
      pinchDist: Math.round(pinchDist),
    });
  }, []);

  const currentProfile = TIMBRE_PROFILES[timbre];

  // State badge colors
  const stateBadge: Record<GestureState, { bg: string; text: string; label: string }> = {
    [GestureState.INACTIVE]: { bg: 'bg-slate-600/30', text: 'text-slate-400', label: 'NO HAND' },
    [GestureState.CUT]:     { bg: 'bg-red-500/20', text: 'text-red-400', label: 'CUT' },
    [GestureState.ACTIVE]:  { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'PLAYING' },
    [GestureState.FLICK_LOCK]: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'FLICK' },
  };

  const badge = stateBadge[stats.gestureState] || stateBadge[GestureState.INACTIVE];

  return (
    <div className="relative w-full h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.05),transparent)] pointer-events-none" />

      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Waves className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Invisible Theremin <span className="text-sky-400">Pro</span></h1>
            <p className="text-xs text-slate-400 font-medium">Gesture Instrument v10.0</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isStarted && (
            <button onClick={() => setIsStarted(false)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl border border-red-500/30 transition-all font-bold text-xs">
              <LogOut className="w-3.5 h-3.5" /> Exit
            </button>
          )}
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="w-full h-full flex items-center justify-center">
        {!isStarted ? (
          <div className="text-center z-10 max-w-md p-8 rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="mb-6 inline-block p-4 bg-sky-500/10 rounded-2xl">
              <Waves className="w-12 h-12 text-sky-400 animate-pulse" />
            </div>
            <h2 className="text-3xl font-bold mb-2 text-white">Invisible Theremin</h2>
            <p className="text-slate-400 text-sm mb-8">
              Professional gesture instrument. <strong>Right hand:</strong> pinch = play, three fingers = volume, depth = pitch, flick = staccato. <strong>Left hand:</strong> octave select. 11 timbres.
            </p>
            <button onClick={() => setIsStarted(true)}
              className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-lg">
              <Hand className="w-5 h-5" /> Start Playing
            </button>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-4">Requires: Camera</p>
          </div>
        ) : (
          <ThereminCore onUpdate={handleUpdate} timbre={timbre} />
        )}
      </main>

      {/* ─── Timbre Selector — Bottom Bar ─── */}
      {isStarted && (
        <div className="absolute bottom-0 left-0 right-0 z-50">
          <div className="bg-slate-950/90 backdrop-blur-xl border-t border-white/5 px-4 py-3">
            {/* Current timbre description */}
            <div className="text-center mb-2">
              <span className="text-sky-400 text-[10px] uppercase tracking-widest font-bold">{currentProfile.label}</span>
              <span className="text-slate-500 text-[10px] ml-2">— {currentProfile.description}</span>
            </div>

            {/* Timbre buttons — wrapped grid */}
            <div className="flex flex-wrap justify-center gap-1.5 max-w-4xl mx-auto">
              {TIMBRE_KEYS.map((key) => {
                const profile = TIMBRE_PROFILES[key];
                const isActive = timbre === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTimbre(key)}
                    className={`
                      px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider
                      transition-all duration-150
                      ${isActive
                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-105'
                        : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-white/5'
                      }
                    `}
                  >
                    {profile.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* HUD — repositioned above timbre bar */}
      {isStarted && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-4 z-50">
          {/* Gesture State Badge */}
          <div className={`px-4 py-3 ${badge.bg} backdrop-blur-md rounded-2xl border border-white/5 flex flex-col items-center min-w-[90px] shadow-xl`}>
            <span className={`text-[10px] uppercase tracking-widest font-bold ${badge.text}`}>State</span>
            <span className={`text-lg font-mono font-bold ${badge.text}`}>{badge.label}</span>
          </div>

          {/* Note */}
          <div className="px-6 py-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/5 flex flex-col items-center min-w-[130px] shadow-xl">
            <div className="flex items-center gap-2 mb-1 text-sky-400 font-mono">
              <Music className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Note</span>
            </div>
            <span className="text-2xl font-mono font-bold tracking-tighter">{stats.note || '—'}</span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">{stats.freq ? `${stats.freq} Hz` : ''}</span>
          </div>

          {/* Volume */}
          <div className="px-6 py-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/5 flex flex-col items-center min-w-[130px] shadow-xl">
            <div className="flex items-center gap-2 mb-1 text-emerald-400">
              <Volume2 className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Level</span>
            </div>
            <span className="text-2xl font-mono font-bold">{Math.round(stats.vol * 100)}</span>
          </div>

          {/* Octave */}
          {stats.octaveBand && (
            <div className="px-4 py-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/5 flex flex-col items-center min-w-[80px] shadow-xl">
              <span className="text-emerald-400 text-[10px] uppercase tracking-widest font-bold">Octave</span>
              <span className="text-lg font-mono font-bold text-emerald-300">{stats.octaveBand}</span>
            </div>
          )}
        </div>
      )}

      {/* Info panel */}
      {showInfo && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-slate-900 rounded-3xl border border-white/10 p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-3xl font-bold mb-8 text-white flex items-center gap-3">
              <HelpCircle className="w-8 h-8 text-sky-400" /> How to Play
            </h3>
            <div className="space-y-6">
              <section>
                <h4 className="text-sky-400 font-bold uppercase tracking-widest text-xs mb-3">Right Hand — The Instrument</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300 text-sm">
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-sky-500/20">
                    <p className="font-bold text-sky-400 mb-2 uppercase text-[10px] tracking-widest">🤏 Pinch = Play/Mute</p>
                    <p>Pinch thumb and index finger together to <strong>start a note</strong>. Open them to <strong>silence</strong>. Like a violin bow.</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-sky-500/20">
                    <p className="font-bold text-sky-400 mb-2 uppercase text-[10px] tracking-widest">🖐️ Three Fingers = Volume</p>
                    <p>While pinching, move your <strong>middle, ring, and pinky fingers</strong> up for louder, down for quieter. Independent of pitch.</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-sky-500/20">
                    <p className="font-bold text-sky-400 mb-2 uppercase text-[10px] tracking-widest">↕ Depth = Pitch</p>
                    <p>Push your right hand <strong>toward the camera</strong> for higher pitch, pull away for lower. Same as before.</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-sky-500/20">
                    <p className="font-bold text-sky-400 mb-2 uppercase text-[10px] tracking-widest">⚡ Flick = Staccato</p>
                    <p>While playing, <strong>flick your three fingers downward fast</strong> for an instant staccato cut. Repinch to resume.</p>
                  </div>
                </div>
              </section>
              <section>
                <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-3">Left Hand — Octave Select</h4>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-emerald-500/20 text-slate-300 text-sm">
                  <p>Raise or lower your left hand to select which <strong>octave</strong> the right hand plays in. Band lines are shown on the left edge. Each timbre has a different number of octave bands.</p>
                </div>
              </section>
              <section>
                <h4 className="text-purple-400 font-bold uppercase tracking-widest text-xs mb-3">Visual Cues</h4>
                <ul className="text-slate-300 text-sm space-y-1 list-disc pl-4">
                  <li><strong className="text-emerald-400">Green</strong> pinch line = note is playing</li>
                  <li><strong className="text-red-400">Red</strong> pinch line = note is cut</li>
                  <li><strong className="text-orange-400">Orange</strong> pinch line = flick lock active</li>
                  <li>Dashed box around hand = volume range</li>
                  <li>White flash = flick detected</li>
                </ul>
              </section>
              <section>
                <h4 className="text-orange-400 font-bold uppercase tracking-widest text-xs mb-3">Tips</h4>
                <ul className="text-slate-300 text-sm space-y-1 list-disc pl-4">
                  <li>Start with <strong>Warm Theremin</strong> — the classic sound.</li>
                  <li><strong>Calibrate</strong> for best results — adapts to your hand size.</li>
                  <li>Move slowly at first. Speed comes with practice.</li>
                  <li>The pinch is your main musical control. Master it first.</li>
                  <li>Flick is an advanced technique — practice after mastering pinch + volume.</li>
                </ul>
              </section>
            </div>
            <button onClick={() => setShowInfo(false)} className="mt-10 w-full py-4 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold transition-colors">
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
