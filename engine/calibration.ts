import type { CalibrationData } from './thereminEngine';

const KEY = 'theremin-pro-calib-v4';

export function loadCalibration(): CalibrationData | null {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) as CalibrationData : null;
  } catch { return null; }
}

export function saveCalibration(d: CalibrationData): void {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {}
}

export function clearCalibration(): void {
  try { localStorage.removeItem(KEY); } catch {}
}

export interface CalibrationStepDef {
  id: string;
  instruction: string;
  hand: 'Right' | 'Left';
  duration: number; // ms to hold
  subStep?: 'a' | 'b' | 'c'; // for multi-phase steps
}

export const CALIBRATION_STEPS: CalibrationStepDef[] = [
  // ── Original 4 steps (pitch + legacy volume placeholder) ──
  { id: 'pitchMin', instruction: 'Hold RIGHT hand FAR (arm extended). Hold 3s.', hand: 'Right', duration: 3000 },
  { id: 'pitchMax', instruction: 'Push RIGHT hand CLOSE to camera (15cm). Hold 3s.', hand: 'Right', duration: 3000 },

  // ── Step 3: Pinch threshold — closed ──
  { id: 'pinchClosed', instruction: 'Make your tightest comfortable pinch and hold for 2 seconds.', hand: 'Right', duration: 2000, subStep: 'a' },

  // ── Step 4: Pinch threshold — open ──
  { id: 'pinchOpen', instruction: 'Now open your fingers to a clear separation and hold for 2 seconds.', hand: 'Right', duration: 2000, subStep: 'b' },

  // ── Step 5: Dynamic range — fingers high ──
  { id: 'drHigh', instruction: 'Pinch your fingers. Raise your 3 bottom fingers as HIGH as comfortable. Hold 2s.', hand: 'Right', duration: 2000, subStep: 'a' },

  // ── Step 6: Dynamic range — fingers low ──
  { id: 'drLow', instruction: 'Keep pinching. Lower your 3 bottom fingers as LOW as comfortable. Hold 2s.', hand: 'Right', duration: 2000, subStep: 'b' },

  // ── Step 7: Flick threshold — 3 flicks ──
  { id: 'flickTest', instruction: 'Do 3 deliberate fast downward flicks of your 3 fingers while keeping the pinch. Flick now!', hand: 'Right', duration: 4000 },
];

/**
 * Compute gesture calibration values from raw samples.
 */
export function computeGestureCalibration(
  pinchClosedAvg: number,
  pinchOpenAvg: number,
  drHighRelY: number,
  drLowRelY: number,
  flickPeakVelocities: number[],
) {
  // Pinch threshold = midpoint between closed and open distances
  const pinchThreshold = (pinchClosedAvg + pinchOpenAvg) / 2;

  // Dynamic range = half the difference between high and low relative positions
  const dynamicRange = (drLowRelY - drHighRelY) / 2;

  // Flick velocity threshold = 60% of average peak velocity
  const avgPeakVel = flickPeakVelocities.length > 0
    ? flickPeakVelocities.reduce((a, b) => a + b, 0) / flickPeakVelocities.length
    : 1.5;
  const flickVelocityThreshold = avgPeakVel * 0.6;

  return {
    pinchThreshold: Math.max(15, pinchThreshold),     // minimum 15px
    dynamicRange: Math.max(0.05, dynamicRange),        // minimum 0.05
    flickVelocityThreshold: Math.max(0.5, flickVelocityThreshold), // minimum 0.5
  };
}
