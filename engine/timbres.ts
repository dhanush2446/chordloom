/**
 * Timbre Profiles for the Virtual Theremin v3
 * ═════════════════════════════════════════════
 *
 * Each profile defines the harmonic series + extended acoustic properties
 * that shape the oscillator's tone into something identifiable as a real instrument.
 *
 * v3 changes:
 * - Added per-timbre acoustic parameters (detuning, noise, tremolo, formants)
 * - Refined harmonics based on real spectral analysis of instruments
 * - Added basic waveform types (sine, sawtooth, square, triangle)
 * - Added acoustic envelope characteristics (attack, brightness curves)
 */

/** Per-timbre acoustic parameters — these shape how each instrument "feels" */
export interface TimbreAcoustics {
  /** Detune range in cents for the 3-oscillator stack [center, sharp, flat] */
  detuneCents: [number, number, number];
  /** Oscillator level balance [center, upper, lower] */
  oscLevels: [number, number, number];
  /** Lowpass filter cutoff base frequency */
  lpFreq: number;
  /** LP filter Q (resonance) — higher = more nasal/resonant */
  lpQ: number;
  /** Vibrato depth in cents */
  vibDepth: number;
  /** Vibrato rate in Hz */
  vibRate: number;
  /** Soft saturation drive amount (0-1) */
  saturation: number;
  /** Tremolo rate in Hz (0 = disabled) — amplitude modulation */
  tremoloRate: number;
  /** Tremolo depth (0-1, 0 = disabled) */
  tremoloDepth: number;
  /** Noise injection (0-1): bow noise, breath, air, etc. */
  noiseLevel: number;
  /** Noise filter frequency — shapes what kind of noise (low = rumble, high = hiss) */
  noiseFilterFreq: number;
  /** Noise filter Q */
  noiseFilterQ: number;
  /** Formant frequencies for voice-like instruments (up to 3), null = none */
  formants: [number, number, number] | null;
  /** Formant bandwidths */
  formantBandwidths: [number, number, number] | null;
  /** Formant gains (0-1) */
  formantGains: [number, number, number] | null;
  /** Highpass filter frequency — lower = more body */
  hpFreq: number;
  /** Attack feel: 'instant' | 'soft' | 'slow' — affects filter envelope on note start */
  attackFeel: 'instant' | 'soft' | 'slow';
  /** Reverb wet/dry mix override (0.0-1.0, null = use default) */
  reverbMix: number | null;
}

export const TIMBRE_PROFILES = {

  // ═══════════════════════════════════════════════════════════════
  //  BASIC WAVEFORMS
  // ═══════════════════════════════════════════════════════════════

  pureSine: {
    label: 'Pure Sine',
    description: 'Clean, ethereal electronic tone — the simplest waveform',
    harmonics: [
      0,
      1.0000,
      0.0200,  // Tiny 2nd harmonic (analog imperfection)
      0.0100,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ],
    acoustics: {
      detuneCents: [0, +3, -3],
      oscLevels: [0.75, 0.15, 0.15],
      lpFreq: 2000,
      lpQ: 0.5,
      vibDepth: 1.5,
      vibRate: 5.5,
      saturation: 0.10,
      tremoloRate: 0,
      tremoloDepth: 0,
      noiseLevel: 0,
      noiseFilterFreq: 1000,
      noiseFilterQ: 1,
      formants: null,
      formantBandwidths: null,
      formantGains: null,
      hpFreq: 40,
      attackFeel: 'instant' as const,
      reverbMix: 0.45,
    } as TimbreAcoustics,
  },

  sawtooth: {
    label: 'Sawtooth',
    description: 'Rich, buzzing — all harmonics present, classic synth lead',
    harmonics: [
      0,
      1.0000,   // 1/1
      0.5000,   // 1/2
      0.3333,   // 1/3
      0.2500,   // 1/4
      0.2000,   // 1/5
      0.1667,   // 1/6
      0.1429,   // 1/7
      0.1250,   // 1/8
      0.1111,   // 1/9
      0.1000,   // 1/10
      0.0909,   // 1/11
      0.0833,   // 1/12
      0.0769,   // 1/13
      0.0714,   // 1/14
      0.0667,   // 1/15
      0.0625,   // 1/16
      0.0588,   // 1/17
      0.0556,   // 1/18
      0.0526,   // 1/19
      0.0500,   // 1/20
      0.0476,   // 1/21
      0.0455,   // 1/22
      0.0435    // 1/23
    ],
    acoustics: {
      detuneCents: [0, +6, -6],
      oscLevels: [0.55, 0.28, 0.28],
      lpFreq: 6000,
      lpQ: 0.8,
      vibDepth: 2.0,
      vibRate: 5.5,
      saturation: 0.30,
      tremoloRate: 0,
      tremoloDepth: 0,
      noiseLevel: 0.005,
      noiseFilterFreq: 4000,
      noiseFilterQ: 0.5,
      formants: null,
      formantBandwidths: null,
      formantGains: null,
      hpFreq: 40,
      attackFeel: 'instant' as const,
      reverbMix: 0.30,
    } as TimbreAcoustics,
  },

  square: {
    label: 'Square',
    description: 'Hollow, retro — odd harmonics only, 8-bit character',
    harmonics: [
      0,
      1.0000,   // 1st
      0.0000,   // 2nd (suppressed)
      0.3333,   // 3rd = 1/3
      0.0000,   // 4th (suppressed)
      0.2000,   // 5th = 1/5
      0.0000,   // 6th (suppressed)
      0.1429,   // 7th = 1/7
      0.0000,   // 8th (suppressed)
      0.1111,   // 9th = 1/9
      0.0000,   // 10th
      0.0909,   // 11th = 1/11
      0.0000,   // 12th
      0.0769,   // 13th = 1/13
      0.0000,   // 14th
      0.0667,   // 15th = 1/15
      0.0000,   // 16th
      0.0588,   // 17th = 1/17
      0.0000,   // 18th
      0.0526,   // 19th = 1/19
      0.0000,   // 20th
      0.0476,   // 21st = 1/21
      0.0000,   // 22nd
      0.0435    // 23rd = 1/23
    ],
    acoustics: {
      detuneCents: [0, +4, -4],
      oscLevels: [0.65, 0.22, 0.22],
      lpFreq: 5000,
      lpQ: 0.6,
      vibDepth: 1.5,
      vibRate: 5.5,
      saturation: 0.20,
      tremoloRate: 0,
      tremoloDepth: 0,
      noiseLevel: 0,
      noiseFilterFreq: 1000,
      noiseFilterQ: 1,
      formants: null,
      formantBandwidths: null,
      formantGains: null,
      hpFreq: 40,
      attackFeel: 'instant' as const,
      reverbMix: 0.25,
    } as TimbreAcoustics,
  },

  triangle: {
    label: 'Triangle',
    description: 'Soft, mellow — odd harmonics with fast decay, flute-like',
    harmonics: [
      0,
      1.0000,   // 1st
      0.0000,   // 2nd (suppressed)
      0.1111,   // 3rd = 1/9
      0.0000,   // 4th (suppressed)
      0.0400,   // 5th = 1/25
      0.0000,   // 6th
      0.0204,   // 7th = 1/49
      0.0000,   // 8th
      0.0123,   // 9th = 1/81
      0.0000,   // 10th
      0.0083,   // 11th = 1/121
      0.0000,   // 12th
      0.0059,   // 13th = 1/169
      0.0000,   // 14th
      0.0044,   // 15th = 1/225
      0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000
    ],
    acoustics: {
      detuneCents: [0, +3, -3],
      oscLevels: [0.70, 0.18, 0.18],
      lpFreq: 3000,
      lpQ: 0.5,
      vibDepth: 2.0,
      vibRate: 5.5,
      saturation: 0.10,
      tremoloRate: 0,
      tremoloDepth: 0,
      noiseLevel: 0,
      noiseFilterFreq: 1000,
      noiseFilterQ: 1,
      formants: null,
      formantBandwidths: null,
      formantGains: null,
      hpFreq: 40,
      attackFeel: 'instant' as const,
      reverbMix: 0.40,
    } as TimbreAcoustics,
  },

  // ═══════════════════════════════════════════════════════════════
  //  THEREMIN
  // ═══════════════════════════════════════════════════════════════

  brightTheremin: {
    label: 'Bright Theremin',
    description: 'Vintage RCA tube theremin — cutting and clear',
    harmonics: [
      0,
      1.0000,
      0.7500,
      0.6000,
      0.5000,
      0.4500,
      0.3500,
      0.3000,
      0.2500,
      0.2000,
      0.1700,
      0.1400,
      0.1100,
      0.0900,
      0.0750,
      0.0600,
      0.0500,
      0.0400,
      0.0320,
      0.0260,
      0.0200,
      0.0150,
      0.0120,
      0.0090
    ],
    acoustics: {
      detuneCents: [0, +5, -5],
      oscLevels: [0.50, 0.30, 0.30],
      lpFreq: 5500,
      lpQ: 1.2,
      vibDepth: 3.0,
      vibRate: 5.5,
      saturation: 0.55,
      tremoloRate: 0,
      tremoloDepth: 0,
      noiseLevel: 0.012,
      noiseFilterFreq: 5000,
      noiseFilterQ: 0.5,
      formants: null,
      formantBandwidths: null,
      formantGains: null,
      hpFreq: 50,
      attackFeel: 'instant' as const,
      reverbMix: 0.30,
    } as TimbreAcoustics,
  },

  // ═══════════════════════════════════════════════════════════════
  //  BRASS
  // ═══════════════════════════════════════════════════════════════

  brass: {
    label: 'Brass',
    description: 'Rich brass ensemble — 3-voice detuned with soft saturation',
    harmonics: [
      0,
      1.0000, 0.8800, 0.7200, 0.5900, 0.4700,
      0.3600, 0.2700, 0.1900, 0.1300, 0.0850,
      0.0540, 0.0330, 0.0190, 0.0110, 0.0060,
      0.0030, 0.0015, 0.0008, 0.0004, 0, 0, 0, 0
    ],
    acoustics: {
      detuneCents: [0, +6, -6],      // Tighter ensemble spread (matched to sample processing)
      oscLevels: [0.45, 0.35, 0.35],
      lpFreq: 4500,
      lpQ: 1.0,
      vibDepth: 2.0,                  // cents depth on detune AudioParam
      vibRate: 5.2,                   // Hz
      saturation: 0.33,               // ~equivalent to tanh(1.65x) drive
      tremoloRate: 0,
      tremoloDepth: 0,
      noiseLevel: 0.030,              // 3% breath noise
      noiseFilterFreq: 2500,          // Bandpass center for breath character
      noiseFilterQ: 0.8,
      formants: null,
      formantBandwidths: null,
      formantGains: null,
      hpFreq: 80,
      attackFeel: 'soft' as const,
      reverbMix: 0.30,                // 30% wet
    } as TimbreAcoustics,
  },

  // ═══════════════════════════════════════════════════════════════
  //  STRINGS
  // ═══════════════════════════════════════════════════════════════

  strings: {
    label: 'Strings',
    description: 'Soaring violin section — emotional and expressive',
    harmonics: [
      0,
      1.0000,
      0.8000,
      0.8500,
      0.6000,
      0.5500,
      0.4000,
      0.3200,
      0.2500,
      0.2000,
      0.1600,
      0.1300,
      0.1000,
      0.0800,
      0.0600,
      0.0450,
      0.0340,
      0.0250,
      0.0180,
      0.0130,
      0.0090,
      0.0060,
      0.0040,
      0.0025
    ],
    acoustics: {
      detuneCents: [0, +15, -15],
      oscLevels: [0.40, 0.38, 0.38],
      lpFreq: 5000,
      lpQ: 0.9,
      vibDepth: 5.0,
      vibRate: 5.8,
      saturation: 0.25,
      tremoloRate: 4.2,
      tremoloDepth: 0.12,
      noiseLevel: 0.045,
      noiseFilterFreq: 3500,
      noiseFilterQ: 1.5,
      formants: null,
      formantBandwidths: null,
      formantGains: null,
      hpFreq: 120,
      attackFeel: 'slow' as const,
      reverbMix: 0.40,
    } as TimbreAcoustics,
  },

  // ═══════════════════════════════════════════════════════════════
  //  WOODWINDS
  // ═══════════════════════════════════════════════════════════════

  hollow: {
    label: 'Hollow',
    description: 'Clarinet-like — pure odd harmonics only',
    harmonics: [
      0,
      1.0000,
      0.0000,
      0.6500,
      0.0000,
      0.3500,
      0.0000,
      0.2000,
      0.0000,
      0.1200,
      0.0000,
      0.0800,
      0.0000,
      0.0500,
      0.0000,
      0.0300,
      0.0000,
      0.0180,
      0.0000,
      0.0100,
      0.0000,
      0.0060,
      0.0000,
      0.0035
    ],
    acoustics: {
      detuneCents: [0, +3, -3],
      oscLevels: [0.70, 0.18, 0.18],
      lpFreq: 2800,
      lpQ: 1.8,
      vibDepth: 1.8,
      vibRate: 5.5,
      saturation: 0.18,
      tremoloRate: 0,
      tremoloDepth: 0,
      noiseLevel: 0.025,
      noiseFilterFreq: 2000,
      noiseFilterQ: 2.0,
      formants: null,
      formantBandwidths: null,
      formantGains: null,
      hpFreq: 80,
      attackFeel: 'soft' as const,
      reverbMix: 0.30,
    } as TimbreAcoustics,
  },

  // ═══════════════════════════════════════════════════════════════
  //  ORGAN
  // ═══════════════════════════════════════════════════════════════

  organ: {
    label: 'Organ',
    description: 'Cathedral pipe organ — massive and majestic',
    harmonics: [
      0,
      1.0000,
      1.0000,
      0.8000,
      1.0000,
      0.0000,
      0.5000,
      0.0000,
      0.2500,
      0.0000,
      0.0000,
      0.0000, 0.0000, 0.0000, 0.0000, 0.0000,
      0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000
    ],
    acoustics: {
      detuneCents: [0, +8, -8],
      oscLevels: [0.50, 0.32, 0.32],
      lpFreq: 6000,
      lpQ: 0.5,
      vibDepth: 3.0,
      vibRate: 6.8,
      saturation: 0.50,
      tremoloRate: 6.8,
      tremoloDepth: 0.20,
      noiseLevel: 0.015,
      noiseFilterFreq: 1500,
      noiseFilterQ: 0.5,
      formants: null,
      formantBandwidths: null,
      formantGains: null,
      hpFreq: 40,
      attackFeel: 'instant' as const,
      reverbMix: 0.50,
    } as TimbreAcoustics,
  },

  // ═══════════════════════════════════════════════════════════════
  //  SAMPLED
  // ═══════════════════════════════════════════════════════════════

  acousticBrass: {
    label: 'Acoustic Brass',
    description: 'Sampled acoustic brass instrument (C3_Brass.wav)',
    harmonics: [0, 1], // Unused for sample playback
    acoustics: {
      detuneCents: [0, 0, 0],
      oscLevels: [1, 0, 0],
      lpFreq: 6000,
      lpQ: 0.5,
      vibDepth: 0,
      vibRate: 0,
      saturation: 0,
      tremoloRate: 0,
      tremoloDepth: 0,
      noiseLevel: 0,
      noiseFilterFreq: 1000,
      noiseFilterQ: 1,
      formants: null,
      formantBandwidths: null,
      formantGains: null,
      hpFreq: 60,
      attackFeel: 'instant' as const,
      reverbMix: null,
    } as TimbreAcoustics,
  }

} as const;

export type BuiltinTimbreKey = keyof typeof TIMBRE_PROFILES;
export type TimbreKey = BuiltinTimbreKey | string;

/** Ordered list of all built-in timbre keys for UI rendering */
export const TIMBRE_KEYS: BuiltinTimbreKey[] = Object.keys(TIMBRE_PROFILES) as BuiltinTimbreKey[];

// ═══════════════════════════════════════════════════════════════
//  CUSTOM TIMBRE SYSTEM — User-Designed Instruments
// ═══════════════════════════════════════════════════════════════

/** Parameters exposed to the user in the Sound Designer */
export interface CustomTimbreParams {
  name: string;
  /** Harmonic levels [fundamental, 2nd, 3rd, 4th, 5th] — each 0-1 */
  harmonics: [number, number, number, number, number];
  /** Detune spread in cents (applied as [0, +spread, -spread]) */
  detuneSpread: number;
  /** Side oscillator balance (0 = center only, 1 = equal) */
  oscBalance: number;
  /** Lowpass filter cutoff Hz */
  lpFreq: number;
  /** Lowpass Q resonance */
  lpQ: number;
  /** Highpass filter cutoff Hz */
  hpFreq: number;
  /** Vibrato depth in cents */
  vibDepth: number;
  /** Vibrato rate in Hz */
  vibRate: number;
  /** Soft saturation drive 0-1 */
  saturation: number;
  /** Tremolo rate Hz (0 = off) */
  tremoloRate: number;
  /** Tremolo depth 0-0.5 */
  tremoloDepth: number;
  /** Noise injection level 0-0.1 */
  noiseLevel: number;
  /** Noise filter center frequency Hz */
  noiseFilterFreq: number;
  /** Reverb wet/dry mix 0-1 */
  reverbMix: number;
  /** Timestamp when created */
  createdAt?: number;
}

/** Default custom timbre parameters — a clean starting point */
export const DEFAULT_CUSTOM_PARAMS: CustomTimbreParams = {
  name: 'My Sound',
  harmonics: [1.0, 0.5, 0.3, 0.2, 0.1],
  detuneSpread: 7,
  oscBalance: 0.5,
  lpFreq: 3200,
  lpQ: 0.7,
  hpFreq: 60,
  vibDepth: 2.5,
  vibRate: 5.5,
  saturation: 0.3,
  tremoloRate: 0,
  tremoloDepth: 0,
  noiseLevel: 0,
  noiseFilterFreq: 3000,
  reverbMix: 0.35,
};

/** Build a full timbre profile from user-facing CustomTimbreParams */
export function buildCustomTimbreProfile(params: CustomTimbreParams) {
  const centerGain = 1.0 - params.oscBalance * 0.5;
  const sideGain = params.oscBalance * 0.5;

  // Extend the 5 user harmonics to a full 24-element array
  const fullHarmonics = new Array(24).fill(0);
  fullHarmonics[0] = 0; // DC offset
  for (let i = 0; i < 5; i++) {
    fullHarmonics[i + 1] = params.harmonics[i];
  }
  // Natural harmonic decay for remaining slots
  for (let i = 6; i < 24; i++) {
    fullHarmonics[i] = Math.max(0, params.harmonics[4] * Math.pow(0.65, i - 5));
  }

  return {
    label: params.name,
    description: `Custom instrument: ${params.name}`,
    harmonics: fullHarmonics,
    acoustics: {
      detuneCents: [0, +params.detuneSpread, -params.detuneSpread] as [number, number, number],
      oscLevels: [centerGain, sideGain, sideGain] as [number, number, number],
      lpFreq: params.lpFreq,
      lpQ: params.lpQ,
      vibDepth: params.vibDepth,
      vibRate: params.vibRate,
      saturation: params.saturation,
      tremoloRate: params.tremoloRate,
      tremoloDepth: params.tremoloDepth,
      noiseLevel: params.noiseLevel,
      noiseFilterFreq: params.noiseFilterFreq,
      noiseFilterQ: 1.0,
      formants: null,
      formantBandwidths: null,
      formantGains: null,
      hpFreq: params.hpFreq,
      attackFeel: 'instant' as const,
      reverbMix: params.reverbMix,
    } as TimbreAcoustics,
  };
}

// ── Runtime Custom Timbre Registry ─────────────────────────────

const _customTimbreRegistry: Map<string, ReturnType<typeof buildCustomTimbreProfile>> = new Map();

/** Register a custom timbre at runtime (makes it available to AudioEngine) */
export function registerCustomTimbre(key: string, params: CustomTimbreParams): void {
  _customTimbreRegistry.set(key, buildCustomTimbreProfile(params));
}

/** Unregister a custom timbre */
export function unregisterCustomTimbre(key: string): void {
  _customTimbreRegistry.delete(key);
}

/** Get a timbre profile — checks custom registry first, then built-ins */
export function getTimbreProfile(key: TimbreKey) {
  if (_customTimbreRegistry.has(key)) return _customTimbreRegistry.get(key)!;
  return (TIMBRE_PROFILES as any)[key] ?? TIMBRE_PROFILES.pureSine;
}

/** Check if a key is a custom timbre */
export function isCustomTimbre(key: string): boolean {
  return _customTimbreRegistry.has(key);
}

/** Get all registered custom timbre keys */
export function getCustomTimbreKeys(): string[] {
  return Array.from(_customTimbreRegistry.keys());
}

// ── LocalStorage persistence for custom instruments ────────────

const STORAGE_KEY = 'cl_custom_instruments';

export interface SavedInstrument {
  id: string;
  params: CustomTimbreParams;
  createdAt: number;
}

/** Load saved instruments from localStorage and register them */
export function loadSavedInstruments(): SavedInstrument[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const instruments: SavedInstrument[] = JSON.parse(data);
    // Register each in the runtime registry
    for (const inst of instruments) {
      registerCustomTimbre(inst.id, inst.params);
    }
    return instruments;
  } catch {
    return [];
  }
}

/** Save an instrument to localStorage */
export function saveInstrument(instrument: SavedInstrument): SavedInstrument[] {
  const instruments = loadSavedInstrumentsRaw();
  const idx = instruments.findIndex(i => i.id === instrument.id);
  if (idx >= 0) {
    instruments[idx] = instrument;
  } else {
    instruments.push(instrument);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(instruments));
  registerCustomTimbre(instrument.id, instrument.params);
  return instruments;
}

/** Delete an instrument from localStorage */
export function deleteInstrument(id: string): SavedInstrument[] {
  const instruments = loadSavedInstrumentsRaw().filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(instruments));
  unregisterCustomTimbre(id);
  return instruments;
}

/** Rename an instrument */
export function renameInstrument(id: string, newName: string): SavedInstrument[] {
  const instruments = loadSavedInstrumentsRaw();
  const inst = instruments.find(i => i.id === id);
  if (inst) {
    inst.params.name = newName;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(instruments));
    registerCustomTimbre(id, inst.params);
  }
  return instruments;
}

/** Raw load without registering (avoids double registration) */
function loadSavedInstrumentsRaw(): SavedInstrument[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}
