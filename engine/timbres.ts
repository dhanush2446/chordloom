/**
 * Timbre Profiles for the Virtual Theremin v2
 * ═════════════════════════════════════════════
 *
 * Each profile defines the harmonic series that shapes the oscillator's tone.
 * Index 0 = DC offset (always 0). Index 1 = fundamental. Index 2+ = overtones.
 * These are passed as the imaginary (sine) coefficients to createPeriodicWave.
 *
 * v2 changes:
 * - Extended to 24 harmonics for richer, more natural timbres
 * - Odd-harmonic emphasis for classic theremin character
 * - Carefully sculpted rolloff curves based on spectral analysis
 *   of real Moog Etherwave and RCA theremin recordings
 */

export const TIMBRE_PROFILES = {

  pureSine: {
    label: 'Pure Sine',
    description: 'Clean, ethereal electronic tone',
    harmonics: [
      0,
      1.0000,
      0.0200,  // Tiny 2nd harmonic (analog imperfection)
      0.0100,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]
  },

  warmTheremin: {
    label: 'Warm Theremin',
    description: 'Classic Moog Etherwave — rich and singing',
    harmonics: [
      0,
      1.0000,  // 1st — fundamental
      0.5500,  // 2nd — octave warmth
      0.4200,  // 3rd — the "singing" quality (crucial!)
      0.2200,  // 4th
      0.3000,  // 5th — odd harmonic emphasis
      0.1200,  // 6th
      0.1800,  // 7th — odd emphasis
      0.0700,  // 8th
      0.1100,  // 9th — odd emphasis
      0.0400,  // 10th
      0.0650,  // 11th — odd emphasis
      0.0250,  // 12th
      0.0400,  // 13th
      0.0150,  // 14th
      0.0250,  // 15th
      0.0100,  // 16th
      0.0180,  // 17th
      0.0060,  // 18th
      0.0120,  // 19th
      0.0040,  // 20th
      0.0080,  // 21st
      0.0025,  // 22nd
      0.0050   // 23rd
    ]
  },

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
    ]
  },

  brass: {
    label: 'Brass',
    description: 'Rich, powerful brass ensemble',
    harmonics: [
      0,
      1.0000, 0.8800, 0.7200, 0.5900, 0.4700,
      0.3600, 0.2700, 0.1900, 0.1300, 0.0850,
      0.0540, 0.0330, 0.0190, 0.0110, 0.0060,
      0.0030, 0.0015, 0.0008, 0.0004, 0, 0, 0, 0
    ]
  },

  mellowBrass: {
    label: 'French Horn',
    description: 'Warm, velvety brass — perfect for legato',
    harmonics: [
      0,
      1.0000, 0.7500, 0.5200, 0.3300, 0.1900,
      0.1000, 0.0500, 0.0230, 0.0100, 0.0040,
      0.0015, 0.0005, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]
  },

  brightBrass: {
    label: 'Trumpet',
    description: 'Bright, heroic trumpet fanfare',
    harmonics: [
      0,
      1.0000, 0.9500, 0.8800, 0.7900, 0.6800,
      0.5600, 0.4400, 0.3300, 0.2300, 0.1500,
      0.0900, 0.0520, 0.0280, 0.0140, 0.0065,
      0.0028, 0.0012, 0.0005, 0, 0, 0, 0, 0
    ]
  },

  strings: {
    label: 'Strings',
    description: 'Soaring violin section — emotional and expressive',
    harmonics: [
      0,
      1.0000,  // fundamental
      0.8000,  // strong 2nd (bowing pressure)
      0.8500,  // strong 3rd (wood resonance)
      0.6000,  // 4th
      0.5500,  // 5th
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
    ]
  },

  cello: {
    label: 'Cello',
    description: 'Deep, resonant cello voice',
    harmonics: [
      0,
      1.0000, 0.7500, 0.5500, 0.4000, 0.3000,
      0.2200, 0.1500, 0.1000, 0.0700, 0.0450,
      0.0300, 0.0180, 0.0100, 0.0060, 0.0030,
      0.0015, 0.0008, 0, 0, 0, 0, 0, 0
    ]
  },

  voice: {
    label: 'Voice',
    description: 'Haunting human vocal — the "singing" theremin',
    harmonics: [
      0,
      1.0000,  // fundamental
      0.4500,  // 2nd — subdued
      0.7500,  // 3rd — strong (vocal formant F1 ~500 Hz)
      0.8500,  // 4th — strong (formant F2 ~1500 Hz at A4)
      0.7000,  // 5th — still strong
      0.3500,  // 6th — drops off
      0.1800,  // 7th
      0.4500,  // 8th — formant F3 (~2500 Hz)
      0.5000,  // 9th — formant peak
      0.4000,  // 10th
      0.2500,  // 11th
      0.1500,  // 12th
      0.0800,  // 13th
      0.0400,  // 14th
      0.0200,  // 15th
      0.0100,  // 16th
      0.0050, 0.0025, 0.0012, 0, 0, 0, 0
    ]
  },

  hollow: {
    label: 'Hollow',
    description: 'Clarinet-like — pure odd harmonics only',
    harmonics: [
      0,
      1.0000,   // 1st
      0.0000,   // 2nd (suppressed)
      0.6500,   // 3rd
      0.0000,   // 4th (suppressed)
      0.3500,   // 5th
      0.0000,   // 6th (suppressed)
      0.2000,   // 7th
      0.0000,   // 8th (suppressed)
      0.1200,   // 9th
      0.0000,   // 10th
      0.0800,   // 11th
      0.0000,   // 12th
      0.0500,   // 13th
      0.0000,   // 14th
      0.0300,   // 15th
      0.0000,   // 16th
      0.0180,   // 17th
      0.0000,   // 18th
      0.0100,   // 19th
      0.0000,   // 20th
      0.0060,   // 21st
      0.0000,   // 22nd
      0.0035    // 23rd
    ]
  },

  organ: {
    label: 'Organ',
    description: 'Cathedral pipe organ — massive and majestic',
    harmonics: [
      0,
      1.0000,   // 8' stop
      1.0000,   // 4' stop (octave)
      0.8000,   // 2⅔' (quint)
      1.0000,   // 2' stop
      0.0000,
      0.5000,   // 1⅓' (larigot)
      0.0000,
      0.2500,   // 1' (sifflöte)
      0.0000,
      0.0000,
      0.0000, 0.0000, 0.0000, 0.0000, 0.0000,
      0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000
    ]
  },

  acousticBrass: {
    label: 'Acoustic Brass',
    description: 'Sampled acoustic brass instrument',
    harmonics: [0, 1] // Unused for sample playback
  }

} as const;

export type TimbreKey = keyof typeof TIMBRE_PROFILES;

/** Ordered list of all timbre keys for UI rendering */
export const TIMBRE_KEYS: TimbreKey[] = Object.keys(TIMBRE_PROFILES) as TimbreKey[];
