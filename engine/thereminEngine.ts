/**
 * Theremin Mapping Engine v10 — Gesture System
 * ═════════════════════════════════════════════
 *
 * Changes from v9:
 *  - Volume mapping REMOVED (now handled by GestureController)
 *  - Pitch filter params updated: minCutoff=1.5, beta=0.007
 *  - Volume filter REMOVED
 *  - Volume auto-range REMOVED
 *  - All palm area / Z fusion pitch logic preserved exactly
 */

import { OneEuroFilter } from './oneEuroFilter';

// ── Musical constants ──────────────────────────────────────────
export interface CalibrationData {
  pitchMinArea: number;
  pitchMaxArea: number;
  pitchMinZ: number;
  pitchMaxZ: number;
  // v10: volume calibration removed (handled by GestureController)
  // v10: new gesture calibration fields
  pinchThreshold?: number;
  dynamicRange?: number;
  flickVelocityThreshold?: number;
}

const MIN_FREQ = 65.41;     // C2
const MAX_FREQ = 2093.00;   // C7 — 5 full octaves
const LOG_MIN = Math.log2(MIN_FREQ);
const LOG_MAX = Math.log2(MAX_FREQ);
const LOG_RANGE = LOG_MAX - LOG_MIN;
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const INV_21 = 1 / 21;

// Hand-loss timing
const GRACE_MS = 400;
const FADE_MS = 250;

// ── Landmark indices for palm polygon (Shoelace area) ──────────
const P0 = 0, P1 = 1, P2 = 5, P3 = 9, P4 = 13, P5 = 17;

export class ThereminEngine {
  // Single pitch filter — heavily smoothed to eliminate jitter
  private pitchFilter: OneEuroFilter;

  private fieldExponent = 1.2;
  private calibration: CalibrationData | null = null;

  // Auto-range trackers (pitch only)
  private autoMinArea = Infinity;
  private autoMaxArea = -Infinity;
  private autoMinZ = Infinity;
  private autoMaxZ = -Infinity;
  private autoSamples = 0;

  // Last known values
  private lastFreq = MIN_FREQ;
  private lastNote = '';
  private lastProx = 0;
  private lastRightTime = 0;

  // Pitch stability: deadzone + secondary EMA smoother
  private lastRawDepth = 0;
  private smoothedFreq = MIN_FREQ;

  // Cached result object — avoids per-frame allocation
  private _pitchResult = { frequency: 0, note: '', proximity: 0 };

  constructor() {
    // Pitch filter: minCutoff=0.4 (heavy smoothing when still), beta=0.003 (slow to react to noise)
    // This dramatically reduces the "shivering" between 2-3 pitches
    this.pitchFilter = new OneEuroFilter(0.4, 0.003, 1.0);
  }

  setCalibration(c: CalibrationData | null) { this.calibration = c; }
  setFieldExponent(e: number) { this.fieldExponent = e < 0.5 ? 0.5 : e > 3.0 ? 3.0 : e; }

  /**
   * Compute palm area — Shoelace formula, UNROLLED for 6 fixed points.
   */
  static computePalmArea(lm: any[], w: number, h: number): number {
    const x0 = lm[P0].x * w, y0 = lm[P0].y * h;
    const x1 = lm[P1].x * w, y1 = lm[P1].y * h;
    const x2 = lm[P2].x * w, y2 = lm[P2].y * h;
    const x3 = lm[P3].x * w, y3 = lm[P3].y * h;
    const x4 = lm[P4].x * w, y4 = lm[P4].y * h;
    const x5 = lm[P5].x * w, y5 = lm[P5].y * h;

    const area = (
      (x0 * y1 - x1 * y0) +
      (x1 * y2 - x2 * y1) +
      (x2 * y3 - x3 * y2) +
      (x3 * y4 - x4 * y3) +
      (x4 * y5 - x5 * y4) +
      (x5 * y0 - x0 * y5)
    );
    return area < 0 ? -area * 0.5 : area * 0.5;
  }

  /**
   * Average Z across all 21 landmarks.
   */
  static computeAverageZ(lm: any[]): number {
    let sum = lm[0].z + lm[1].z + lm[2].z + lm[3].z + lm[4].z +
              lm[5].z + lm[6].z + lm[7].z + lm[8].z + lm[9].z +
              lm[10].z + lm[11].z + lm[12].z + lm[13].z + lm[14].z +
              lm[15].z + lm[16].z + lm[17].z + lm[18].z + lm[19].z +
              lm[20].z;
    return -sum * INV_21;
  }

  /**
   * Map right-hand depth to pitch frequency (C2–C7).
   * Returns reused object — do NOT store the reference across frames.
   */
  mapPitch(area: number, avgZ: number, tSec: number) {
    let normArea: number;
    let normZ: number;

    if (this.calibration) {
      const c = this.calibration;
      const aRange = c.pitchMaxArea - c.pitchMinArea;
      normArea = aRange > 100 ? (area - c.pitchMinArea) / aRange : 0.5;
      const zRange = c.pitchMaxZ - c.pitchMinZ;
      normZ = zRange > 0.01 ? (avgZ - c.pitchMinZ) / zRange : 0.5;
    } else {
      // Auto-range: fast attack, 0.003 decay (~1.5s adapt)
      this.autoSamples++;

      if (area > 0) {
        if (area < this.autoMinArea) this.autoMinArea = area;
        else this.autoMinArea += (area - this.autoMinArea) * 0.003;
        if (area > this.autoMaxArea) this.autoMaxArea = area;
        else this.autoMaxArea += (area - this.autoMaxArea) * 0.003;
      }

      if (avgZ < this.autoMinZ && avgZ > -5) this.autoMinZ = avgZ;
      else this.autoMinZ += (avgZ - this.autoMinZ) * 0.003;
      if (avgZ > this.autoMaxZ && avgZ < 5) this.autoMaxZ = avgZ;
      else this.autoMaxZ += (avgZ - this.autoMaxZ) * 0.003;

      const settled = this.autoSamples > 25;
      const aMin = settled ? this.autoMinArea : 2000;
      const aMax = settled ? this.autoMaxArea : 30000;
      const zMin = settled ? this.autoMinZ : -0.15;
      const zMax = settled ? this.autoMaxZ : 0.15;

      const aRange = aMax - aMin;
      normArea = (area - aMin) / (aRange > 2000 ? aRange : 2000);
      const zRange = zMax - zMin;
      normZ = (avgZ - zMin) / (zRange > 0.03 ? zRange : 0.03);
    }

    // Inline clamp [0, 1]
    if (normArea < 0) normArea = 0; else if (normArea > 1) normArea = 1;
    if (normZ < 0) normZ = 0; else if (normZ > 1) normZ = 1;

    // Depth fusion: 75% area + 25% Z
    let rawDepth = 0.75 * normArea + 0.25 * normZ;

    // ── Deadzone: ignore tiny jitter in depth ──
    // If the depth change is < 0.008 (sub-pixel noise), keep the previous value
    const depthDelta = Math.abs(rawDepth - this.lastRawDepth);
    if (depthDelta < 0.008) {
      rawDepth = this.lastRawDepth;
    } else {
      this.lastRawDepth = rawDepth;
    }

    // Capacitive response curve
    const clamped = rawDepth < 0 ? 0 : rawDepth > 1 ? 1 : rawDepth;
    const proximity = Math.pow(clamped, this.fieldExponent);

    // Logarithmic frequency mapping: [0,1] → [C2, C7]
    const rawFreq = Math.pow(2, LOG_MIN + proximity * LOG_RANGE);

    // Single adaptive filter (heavily smoothed)
    const filtered = this.pitchFilter.filter(rawFreq, tSec);

    // ── Secondary EMA smoother — final jitter removal ──
    // α=0.15 → very smooth, eliminates residual 2-3 note shiver
    const EMA_ALPHA = 0.15;
    this.smoothedFreq = EMA_ALPHA * filtered + (1 - EMA_ALPHA) * this.smoothedFreq;
    const frequency = this.smoothedFreq;

    this.lastFreq = frequency;
    this.lastNote = this._freqToNote(frequency);
    this.lastProx = proximity;
    this.lastRightTime = tSec * 1000;

    // Reuse cached object
    const r = this._pitchResult;
    r.frequency = frequency;
    r.note = this.lastNote;
    r.proximity = proximity;
    return r;
  }

  /** Get last known pitch values during hand loss. */
  getLastPitch() {
    return {
      frequency: this.lastFreq,
      note: this.lastNote,
      proximity: this.lastProx,
    };
  }

  private _freqToNote(f: number): string {
    if (f <= 0) return '';
    const semi = 12 * Math.log2(f / 16.3516);
    const r = (semi + 0.5) | 0;
    const n = ((r % 12) + 12) % 12;
    const oct = (r / 12) | 0;
    return `${NOTES[n]}${oct}`;
  }

  reset() {
    this.pitchFilter.reset();
    this.lastFreq = MIN_FREQ;
    this.lastNote = '';
    this.lastProx = 0;
    this.lastRightTime = 0;
    this.lastRawDepth = 0;
    this.smoothedFreq = MIN_FREQ;
    this.autoMinArea = Infinity;
    this.autoMaxArea = -Infinity;
    this.autoMinZ = Infinity;
    this.autoMaxZ = -Infinity;
    this.autoSamples = 0;
  }
}
