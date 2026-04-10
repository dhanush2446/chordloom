/**
 * Octave Control — Left Hand Band Selector
 * ═════════════════════════════════════════
 *
 * Maps left-hand wrist Y position to discrete octave bands.
 * Band count varies by timbre type. 8-frame hysteresis prevents
 * flickering at band boundaries.
 */

import type { TimbreKey } from './timbres';

// ── Octave frequencies ──────────────────────────────────────────
const FREQ_C2 = 65.41;
const FREQ_C3 = 130.81;
const FREQ_C4 = 261.63;
const FREQ_C5 = 523.25;
const FREQ_C6 = 1046.50;

// ── Band definitions per timbre group ───────────────────────────
interface OctaveBandDef {
  note: string;
  freq: number;
}

const BANDS_5_C2: OctaveBandDef[] = [
  { note: '2', freq: FREQ_C2 },
  { note: '3', freq: FREQ_C3 },
  { note: '4', freq: FREQ_C4 },
  { note: '5', freq: FREQ_C5 },
  { note: '6', freq: FREQ_C6 },
];

const BANDS_4_C2: OctaveBandDef[] = [
  { note: '2', freq: FREQ_C2 },
  { note: '3', freq: FREQ_C3 },
  { note: '4', freq: FREQ_C4 },
  { note: '5', freq: FREQ_C5 },
];

const BANDS_4_C3: OctaveBandDef[] = [
  { note: '3', freq: FREQ_C3 },
  { note: '4', freq: FREQ_C4 },
  { note: '5', freq: FREQ_C5 },
  { note: '6', freq: FREQ_C6 },
];

// ── Timbre → band mapping ───────────────────────────────────────
const TIMBRE_BANDS: Record<string, OctaveBandDef[]> = {
  // Theremin timbres: 5 bands C2–C6
  pureSine:       BANDS_5_C2,
  warmTheremin:   BANDS_5_C2,
  brightTheremin: BANDS_5_C2,

  // Brass: 4 bands C2–C5
  brass:          BANDS_4_C2,
  mellowBrass:    BANDS_4_C2,
  brightBrass:    BANDS_4_C2,

  // Strings: 5 bands C2–C6
  strings:        BANDS_5_C2,
  cello:          BANDS_5_C2,

  // Voice: 4 bands C3–C6
  voice:          BANDS_4_C3,

  // Organ: 5 bands C2–C6
  organ:          BANDS_5_C2,

  // Hollow: 4 bands C3–C6
  hollow:         BANDS_4_C3,
};

const HYSTERESIS_FRAMES = 8;
const DEFAULT_BAND_INDEX = 2; // Start in middle octave

export interface OctaveOutput {
  bandIndex: number;
  bandCount: number;
  baseFrequency: number;
  noteName: string;
  bands: OctaveBandDef[];
}

export class OctaveController {
  private currentBand = DEFAULT_BAND_INDEX;
  private candidateBand = DEFAULT_BAND_INDEX;
  private candidateFrames = 0;
  private currentTimbre: TimbreKey = 'warmTheremin';
  private bands: OctaveBandDef[] = BANDS_5_C2;

  /**
   * Update octave selection based on left-hand wrist Y.
   *
   * @param wristY - Normalized wrist Y position (0 = top, 1 = bottom)
   * @param timbreKey - Current timbre (determines band count)
   * @param span - Normalized height of the active octave detection area (default 0.5)
   */
  update(wristY: number, timbreKey: TimbreKey, span: number = 0.5): OctaveOutput {
    // Update bands if timbre changed
    if (timbreKey !== this.currentTimbre) {
      this.currentTimbre = timbreKey;
      this.bands = TIMBRE_BANDS[timbreKey] || BANDS_5_C2;
      // Clamp current band to new range
      if (this.currentBand >= this.bands.length) {
        this.currentBand = this.bands.length - 1;
      }
    }

    const numBands = this.bands.length;

    // Map Y to band index within the specific span
    // Center the span around Y = 0.5
    const minY = 0.5 - span / 2;
    const maxY = 0.5 + span / 2;
    const clampedY = Math.max(minY, Math.min(maxY, wristY));
    const normalizedY = (clampedY - minY) / span;

    // Invert so that high hand = high octave
    let rawBand = Math.floor((1.0 - normalizedY) * numBands);
    rawBand = rawBand < 0 ? 0 : rawBand >= numBands ? numBands - 1 : rawBand;

    // Hysteresis: only change after 8 consecutive frames of stable new band
    if (rawBand !== this.currentBand) {
      if (rawBand === this.candidateBand) {
        this.candidateFrames++;
        if (this.candidateFrames >= HYSTERESIS_FRAMES) {
          this.currentBand = rawBand;
          this.candidateFrames = 0;
        }
      } else {
        this.candidateBand = rawBand;
        this.candidateFrames = 1;
      }
    } else {
      this.candidateFrames = 0;
    }

    const band = this.bands[this.currentBand];

    return {
      bandIndex: this.currentBand,
      bandCount: numBands,
      baseFrequency: band.freq,
      noteName: band.note,
      bands: this.bands,
    };
  }

  /**
   * Scale a raw depth-based frequency to sit within the selected octave.
   * The raw frequency from ThereminEngine spans the full C2–C7 range.
   * This maps it proportionally into a single octave starting at baseFrequency.
   *
   * @param rawFreq - Raw frequency from depth mapping (C2–C7)
   * @param baseFreq - Base frequency of the selected octave band
   */
  static scaleToOctave(rawFreq: number, baseFreq: number): number {
    // Convert raw frequency to a 0–1 position within its current octave
    const log2Raw = Math.log2(rawFreq);
    const octavePosition = log2Raw - Math.floor(log2Raw); // fractional part = position within octave

    // Map to the target octave
    return baseFreq * Math.pow(2, octavePosition);
  }

  reset(): void {
    this.currentBand = DEFAULT_BAND_INDEX;
    this.candidateBand = DEFAULT_BAND_INDEX;
    this.candidateFrames = 0;
  }
}
