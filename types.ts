import type { GestureState } from './engine/gestureState';

export interface HandData {
  isDetected: boolean;
  handedness: 'Left' | 'Right';
  wristX: number;   // normalized 0-1 (mirrored)
  wristY: number;   // normalized 0-1
  timestamp: number; // performance.now() in ms
}

export interface ThereminState {
  frequency: number;       // Hz
  volume: number;          // 0.0 to 1.0
  noteName: string;        // "A4", "C#5", etc.
  pitchProximity: number;  // 0.0 to 1.0 (visual feedback)
  gestureState: GestureState;  // INACTIVE, CUT, ACTIVE, FLICK_LOCK
  octaveBand: string;      // "C2", "C3", etc.
  pinchDistance: number;   // pixels
}
