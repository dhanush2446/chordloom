/**
 * Timbre Profiles for the Virtual Theremin
 * ═════════════════════════════════════════
 *
 * Each profile defines the harmonic series that shapes the oscillator's tone.
 * Index 0 = DC offset (always 0). Index 1 = fundamental. Index 2+ = overtones.
 * These are passed as the imaginary (sine) coefficients to createPeriodicWave.
 * The real (cosine) coefficients are always zero.
 *
 * disableNormalization is false, so the browser auto-normalizes peak amplitude
 * to prevent volume jumps between timbres.
 */

export const TIMBRE_PROFILES = {

  pureSine: {
    label: 'Pure Sine',
    description: 'Clean electronic tone',
    harmonics: [
      0,
      1.0000,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]
  },

  warmTheremin: {
    label: 'Warm Theremin',
    description: 'Classic Moog Etherwave character',
    harmonics: [
      0,
      1.0000, 0.6000, 0.4000, 0.3000, 0.2000,
      0.1500, 0.1200, 0.0900, 0.0700, 0.0500,
      0.0400, 0.0300, 0.0200, 0.0150, 0.0100, 0.0080
    ]
  },

  brightTheremin: {
    label: 'Bright Theremin',
    description: 'Vintage tube theremin character',
    harmonics: [
      0,
      1.0000, 0.7000, 0.5500, 0.4500, 0.3500,
      0.2800, 0.2200, 0.1800, 0.1400, 0.1100,
      0.0900, 0.0700, 0.0600, 0.0500, 0.0400, 0.0350
    ]
  },

  brass: {
    label: 'Brass',
    description: 'Trumpet and trombone character',
    harmonics: [
      0,
      1.0000, 0.8800, 0.7200, 0.5900, 0.4700,
      0.3600, 0.2700, 0.1900, 0.1300, 0.0850,
      0.0540, 0.0330, 0.0190, 0.0110, 0.0060, 0.0030
    ]
  },

  mellowBrass: {
    label: 'French Horn',
    description: 'Warm, mellow brass character',
    harmonics: [
      0,
      1.0000, 0.7500, 0.5200, 0.3300, 0.1900,
      0.1000, 0.0500, 0.0230, 0.0100, 0.0040,
      0.0015, 0.0005, 0, 0, 0, 0
    ]
  },

  brightBrass: {
    label: 'Trumpet',
    description: 'Bright, cutting trumpet character',
    harmonics: [
      0,
      1.0000, 0.9500, 0.8800, 0.7900, 0.6800,
      0.5600, 0.4400, 0.3300, 0.2300, 0.1500,
      0.0900, 0.0520, 0.0280, 0.0140, 0.0065, 0.0028
    ]
  },

  strings: {
    label: 'Strings',
    description: 'Violin and cello character',
    harmonics: [
      0,
      1.0000, 0.9000, 0.8500, 0.7000, 0.5000,
      0.4000, 0.3000, 0.2200, 0.1700, 0.1300,
      0.1000, 0.0800, 0.0600, 0.0400, 0.0300, 0.0200
    ]
  },

  cello: {
    label: 'Cello',
    description: 'Warm, deep string character',
    harmonics: [
      0,
      1.0000, 0.7000, 0.5000, 0.3500, 0.2500,
      0.1500, 0.0800, 0.0400, 0.0200, 0.0100,
      0.0050, 0, 0, 0, 0, 0
    ]
  },

  voice: {
    label: 'Voice',
    description: 'Human vocal character',
    harmonics: [
      0,
      1.0000, 0.5000, 0.7000, 0.8000, 0.7000,
      0.3000, 0.1500, 0.4000, 0.4500, 0.3500,
      0.2000, 0.1000, 0.0500, 0.0300, 0.0200, 0.0100
    ]
  },

  hollow: {
    label: 'Hollow',
    description: 'Clarinet-like, odd harmonics only',
    harmonics: [
      0,
      1.0000, 0.0000, 0.6500, 0.0000, 0.3500,
      0.0000, 0.2000, 0.0000, 0.1200, 0.0000,
      0.0800, 0.0000, 0.0500, 0.0000, 0.0300, 0.0000
    ]
  },

  organ: {
    label: 'Organ',
    description: 'Church pipe organ character',
    harmonics: [
      0,
      1.0000, 1.0000, 0.8000, 1.0000, 0.0000,
      0.5000, 0.0000, 0.2500, 0.0000, 0.0000,
      0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000
    ]
  },

  acousticBrass: {
    label: 'Acoustic Brass',
    description: 'Sampled acoustic brass instrument',
    harmonics: [0, 1] // Unused for sample playback, but required to satisfy the type
  }

} as const;

export type TimbreKey = keyof typeof TIMBRE_PROFILES;

/** Ordered list of all timbre keys for UI rendering */
export const TIMBRE_KEYS: TimbreKey[] = Object.keys(TIMBRE_PROFILES) as TimbreKey[];
