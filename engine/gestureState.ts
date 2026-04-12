/**
 * Gesture State Machine — Right Hand Controller
 * ═══════════════════════════════════════════════
 *
 * States: INACTIVE → CUT → ACTIVE → FLICK_LOCK
 *
 * The right hand is a complete musical instrument controller:
 *   Pinch (thumb+index) = gate (note on/off)
 *   Three fingers (middle+ring+pinky) = volume
 *   Fast flick downward = staccato mute
 *   Depth (palm area + Z) = pitch (handled externally by ThereminEngine)
 */

import { OneEuroFilter } from './oneEuroFilter';

// ── State Enum ──────────────────────────────────────────────────
export enum GestureState {
  INACTIVE    = 'INACTIVE',
  CUT         = 'CUT',
  ACTIVE      = 'ACTIVE',
  FLICK_LOCK  = 'FLICK_LOCK',
}

// ── Defaults (overridden by calibration) ────────────────────────
const DEFAULT_PINCH_THRESHOLD = 50;     // pixels (used only as fallback)
const DEFAULT_DYNAMIC_RANGE   = 0.15;   // normalized Y units
const DEFAULT_FLICK_VEL_THRESHOLD = 1.5; // normalized units/second

// ── Pinch detection via normalized ratio ────────────────────────
// ratio = (thumb tip ↔ index tip distance) / (wrist ↔ middle MCP distance)
// This is SCALE-INVARIANT — works at any hand distance from camera.
//
// REAL-WORLD CALIBRATION (from user testing):
//   Fingers touching:  ratio ≈ 0.10–0.20
//   Fingers 2cm apart: ratio ≈ 0.25–0.35
//   Fingers wide open:  ratio ≈ 0.60–1.00
//
// The user wants release to trigger at just ~2cm separation.
const PINCH_CLOSE_RATIO = 0.22;  // ratio below this → pinched (fingers nearly touching)
const PINCH_OPEN_RATIO  = 0.32;  // ratio above this → released (~2cm separation)

// ── Pinch debounce ──────────────────────────────────────────────
// ZERO debounce — instant response, no frame delay
const PINCH_DEBOUNCE_FRAMES = 0;

// ── Timing constants ────────────────────────────────────────────
const FADE_IN_TC        = 0.005;  //  5ms — instant note on
const FADE_OUT_TC       = 0.005;  //  5ms — instant note off
const FLICK_FADE_TC     = 0.003;  //  3ms — instant staccato
const HAND_LOSS_FADE_TC = 0.015;  // 15ms — fast mute on hand loss
const HAND_LOSS_GRACE   = 400;    // ms before clearing state on hand loss
const FLICK_COOLDOWN    = 500;    // ms before next flick can trigger
const FLICK_LOCK_AUTO   = 300;    // ms before auto-release if pinch held

// ── Velocity buffer size ────────────────────────────────────────
const VEL_BUFFER_SIZE = 5;

// ── Stable anchor EMA rate ──────────────────────────────────────
const ANCHOR_SMOOTH = 0.95;
const ANCHOR_REACT  = 0.05;

export interface GestureOutput {
  state: GestureState;
  volume: number;            // 0–1, with power curve applied
  pinchDistance: number;     // raw pixel distance
  fingerAvgY: number;       // normalized 0–1
  stableAnchorY: number;    // normalized 0–1
  flickTriggered: boolean;  // true on the frame a flick fires
  dynamicRangeUpper: number; // normalized Y for upper limit
  dynamicRangeLower: number; // normalized Y for lower limit
}

export class GestureController {
  // ── Thresholds ──
  private pinchThreshold  = DEFAULT_PINCH_THRESHOLD;
  private dynamicRange    = DEFAULT_DYNAMIC_RANGE;
  private flickVelThreshold = DEFAULT_FLICK_VEL_THRESHOLD;

  // ── State ──
  private _state: GestureState = GestureState.INACTIVE;
  private _prevState: GestureState = GestureState.INACTIVE;

  // ── Pinch ──
  private pinchFilter = new OneEuroFilter(8.0, 0.5, 1.0); // high responsiveness for pinch
  private _pinchDistance = 0;
  private _isPinched = false;       // current debounced pinch state
  private pinchRawState = false;    // what the raw distance says
  private pinchDebounceCount = 0;   // frames of raw agreement

  // ── Volume ──
  private volumeFilter = new OneEuroFilter(0.8, 0.003, 1.0);
  private _volume = 0;
  private _fingerAvgY = 0.5;
  private _stableAnchorY = 0.5;
  private _anchorInitialized = false;

  // ── Flick ──
  private velBuffer: number[] = [];
  private prevFingerAvgY = -1;
  private prevTimestamp = 0;
  private flickCooldownEnd = 0;
  private flickLockStart = 0;
  private _flickTriggered = false;
  private pinchOpenedDuringLock = false;

  // ── Hand loss ──
  private lastHandSeenMs = 0;
  private handLossTimer: number | null = null;

  // ── Canvas dimensions (for pixel-based pinch distance) ──
  private canvasWidth = 1280;
  private canvasHeight = 720;

  get state() { return this._state; }
  get volume() { return this._volume; }
  get pinchDistance() { return this._pinchDistance; }

  setCanvasDimensions(w: number, h: number) {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  setCalibration(pinchThreshold: number, dynamicRange: number, flickVelThreshold: number) {
    this.pinchThreshold = pinchThreshold;
    this.dynamicRange = dynamicRange;
    this.flickVelThreshold = flickVelThreshold;
  }

  /**
   * Process one frame of right-hand landmarks.
   * Called every frame when right hand is detected.
   *
   * @param landmarks - MediaPipe 21-landmark array (normalized 0–1)
   * @param tSec - timestamp in seconds (performance.now()/1000)
   * @param audioCtx - AudioContext for currentTime
   * @param gainNode - GainNode for fade control
   */
  update(
    landmarks: any[],
    tSec: number,
    audioCtx: AudioContext | null,
    gainNode: GainNode | null,
  ): GestureOutput {
    const nowMs = tSec * 1000;
    this.lastHandSeenMs = nowMs;
    this._flickTriggered = false;

    // ── 1. Pinch detection — SCALE-INVARIANT RATIO ──
    // Uses ratio of (thumb tip ↔ index tip) / (wrist ↔ middle MCP)
    // This works at ANY hand distance from camera.
    const thumb = landmarks[4];   // thumb tip
    const index = landmarks[8];   // index finger tip
    const wrist = landmarks[0];   // wrist
    const middleMCP = landmarks[9]; // middle finger MCP

    // Thumb-index tip distance (normalized coordinates, no pixel conversion needed)
    const dx = thumb.x - index.x;
    const dy = thumb.y - index.y;
    const tipDist = Math.sqrt(dx * dx + dy * dy);

    // Palm reference size: wrist ↔ middle MCP (stable, always visible)
    const px = wrist.x - middleMCP.x;
    const py = wrist.y - middleMCP.y;
    const palmSize = Math.sqrt(px * px + py * py);

    // Normalized pinch ratio (0 = fully pinched, 1+ = fully open)
    const pinchRatio = palmSize > 0.01 ? tipDist / palmSize : 1.0;

    // Still store pixel distance for visual feedback / calibration display
    const rawPinchDist = tipDist * Math.max(this.canvasWidth, this.canvasHeight);
    this._pinchDistance = this.pinchFilter.filter(rawPinchDist, tSec);

    // ── Hysteresis on ratio (NO debounce — instant response) ──
    let rawPinched: boolean;
    if (this._isPinched) {
      // Currently pinched → need ratio ABOVE open threshold to release
      rawPinched = pinchRatio < PINCH_OPEN_RATIO;
    } else {
      // Currently open → need ratio BELOW close threshold to pinch
      rawPinched = pinchRatio < PINCH_CLOSE_RATIO;
    }

    // Instant state change — zero debounce for maximum responsiveness
    this._isPinched = rawPinched;

    const isPinched = this._isPinched;

    // ── 2. Pinch anchor Y (normalized) ──
    const pinchAnchorY = (thumb.y + index.y) / 2;

    // Initialize stable anchor on first frame
    if (!this._anchorInitialized) {
      this._stableAnchorY = pinchAnchorY;
      this._anchorInitialized = true;
    } else {
      // EMA: slow-following anchor
      this._stableAnchorY = this._stableAnchorY * ANCHOR_SMOOTH + pinchAnchorY * ANCHOR_REACT;
    }

    // ── 3. Three-finger average Y (normalized) ──
    const middle = landmarks[12];
    const ring   = landmarks[16];
    const pinky  = landmarks[20];
    this._fingerAvgY = (middle.y + ring.y + pinky.y) / 3;

    // ── 4. Relative Y position (fingers vs stable anchor) ──
    const relativeY = this._fingerAvgY - this._stableAnchorY;

    // ── 5. Map to volume ──
    const dr = this.dynamicRange;
    let rawVolume = 1.0 - ((relativeY + dr) / (2 * dr));
    rawVolume = rawVolume < 0 ? 0 : rawVolume > 1 ? 1 : rawVolume;

    // Power curve for musical control
    const curvedVolume = Math.pow(rawVolume, 1.5);
    const filteredVolume = this.volumeFilter.filter(curvedVolume, tSec);
    this._volume = filteredVolume;

    // ── 6. Finger velocity for flick detection ──
    let smoothVelocity = 0;
    if (this.prevTimestamp > 0) {
      const dt = tSec - this.prevTimestamp;
      if (dt > 0 && dt < 1) {
        const velocity = (this._fingerAvgY - this.prevFingerAvgY) / dt;
        this.velBuffer.push(velocity);
        if (this.velBuffer.length > VEL_BUFFER_SIZE) {
          this.velBuffer.shift();
        }
        // Average of buffer
        let sum = 0;
        for (let i = 0; i < this.velBuffer.length; i++) sum += this.velBuffer[i];
        smoothVelocity = sum / this.velBuffer.length;
      }
    }
    this.prevFingerAvgY = this._fingerAvgY;
    this.prevTimestamp = tSec;

    // ── 7. Flick detection ──
    const flickCondition1 = smoothVelocity > this.flickVelThreshold;
    const flickCondition2 = this._state === GestureState.ACTIVE;
    const flickCondition3 = this._fingerAvgY > (this._stableAnchorY + dr * 0.7);
    const flickCondition4 = nowMs > this.flickCooldownEnd;

    const flickDetected = flickCondition1 && flickCondition2 && flickCondition3 && flickCondition4;

    // ── 8. State transitions ──
    this._prevState = this._state;

    switch (this._state) {
      case GestureState.INACTIVE:
        // Hand has appeared
        if (isPinched) {
          this._state = GestureState.ACTIVE;
          this._fadeGain(gainNode, audioCtx, this._volume * 0.5, FADE_IN_TC);
        } else {
          this._state = GestureState.CUT;
          this._fadeGain(gainNode, audioCtx, 0, FADE_OUT_TC);
        }
        break;

      case GestureState.CUT:
        if (isPinched) {
          this._state = GestureState.ACTIVE;
          this._fadeGain(gainNode, audioCtx, this._volume * 0.5, FADE_IN_TC);
        }
        // Gain stays at 0 during CUT
        break;

      case GestureState.ACTIVE:
        if (flickDetected) {
          // ACTIVE → FLICK_LOCK
          this._state = GestureState.FLICK_LOCK;
          this._fadeGain(gainNode, audioCtx, 0, FLICK_FADE_TC);
          this.flickCooldownEnd = nowMs + FLICK_COOLDOWN;
          this.flickLockStart = nowMs;
          this._flickTriggered = true;
          this.pinchOpenedDuringLock = false;
        } else if (!isPinched) {
          // ACTIVE → CUT
          this._state = GestureState.CUT;
          this._fadeGain(gainNode, audioCtx, 0, FADE_OUT_TC);
        } else {
          // Still ACTIVE — update volume
          this._fadeGain(gainNode, audioCtx, this._volume * 0.5, 0.015);
        }
        break;

      case GestureState.FLICK_LOCK:
        // Track if pinch opened during lock
        if (!isPinched) {
          this.pinchOpenedDuringLock = true;
        }

        // Release conditions
        const lockElapsed = nowMs - this.flickLockStart;
        const autoRelease = lockElapsed >= FLICK_LOCK_AUTO && isPinched;
        const repinchRelease = this.pinchOpenedDuringLock && isPinched;

        if (autoRelease || repinchRelease) {
          this._state = GestureState.ACTIVE;
          this._fadeGain(gainNode, audioCtx, this._volume * 0.5, FADE_IN_TC);
        } else if (!isPinched && lockElapsed >= FLICK_LOCK_AUTO) {
          // Player opened pinch after lock auto time — go to CUT
          this._state = GestureState.CUT;
        }
        // Gain stays at 0 during FLICK_LOCK
        break;
    }

    // Dynamic range limits
    const upperLimit = this._stableAnchorY - dr;
    const lowerLimit = this._stableAnchorY + dr;

    return {
      state: this._state,
      volume: this._volume,
      pinchDistance: this._pinchDistance,
      fingerAvgY: this._fingerAvgY,
      stableAnchorY: this._stableAnchorY,
      flickTriggered: this._flickTriggered,
      dynamicRangeUpper: upperLimit,
      dynamicRangeLower: lowerLimit,
    };
  }

  /**
   * Called when right hand is lost.
   * Implements grace period before clearing state.
   */
  onHandLost(
    nowMs: number,
    audioCtx: AudioContext | null,
    gainNode: GainNode | null,
  ): void {
    // If mid-note, fade out with longer time constant
    if (this._state === GestureState.ACTIVE) {
      this._fadeGain(gainNode, audioCtx, 0, HAND_LOSS_FADE_TC);
    }

    // After grace period, go INACTIVE
    if (this.handLossTimer === null) {
      this.handLossTimer = window.setTimeout(() => {
        this._state = GestureState.INACTIVE;
        this.handLossTimer = null;
      }, HAND_LOSS_GRACE);
    }
  }

  /**
   * Cancel hand loss timer (hand reappeared within grace period).
   */
  cancelHandLoss(): void {
    if (this.handLossTimer !== null) {
      clearTimeout(this.handLossTimer);
      this.handLossTimer = null;
    }
  }

  /**
   * Smooth gain transition using setTargetAtTime.
   * Never assigns .value directly.
   */
  private _fadeGain(
    gainNode: GainNode | null,
    audioCtx: AudioContext | null,
    target: number,
    timeConstant: number,
  ): void {
    if (!gainNode || !audioCtx) return;
    gainNode.gain.setTargetAtTime(target, audioCtx.currentTime, timeConstant);
  }

  reset(): void {
    this._state = GestureState.INACTIVE;
    this._prevState = GestureState.INACTIVE;
    this._pinchDistance = 0;
    this._isPinched = false;
    this.pinchRawState = false;
    this.pinchDebounceCount = 0;
    this._volume = 0;
    this._fingerAvgY = 0.5;
    this._stableAnchorY = 0.5;
    this._anchorInitialized = false;
    this.velBuffer = [];
    this.prevFingerAvgY = -1;
    this.prevTimestamp = 0;
    this.flickCooldownEnd = 0;
    this.flickLockStart = 0;
    this._flickTriggered = false;
    this.pinchOpenedDuringLock = false;
    this.pinchFilter.reset();
    this.volumeFilter.reset();
    if (this.handLossTimer !== null) {
      clearTimeout(this.handLossTimer);
      this.handLossTimer = null;
    }
  }
}
