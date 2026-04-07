/**
 * Web Audio Synthesis Engine v10 — Timbre + Gesture Fades
 * ═══════════════════════════════════════════════════════
 *
 * Signal path: OscillatorNode → GainNode → AudioContext.destination
 *
 * ALL timbres use createPeriodicWave. No oscillator.type strings.
 * All 11 PeriodicWave objects are pre-built at init time.
 * Switching timbre is a single setPeriodicWave call — zero computation.
 *
 * v10 additions: Exposed AudioContext and GainNode for GestureController.
 * Added convenience fade methods with specific time constants.
 */

import { TIMBRE_PROFILES, TimbreKey } from './timbres';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private _gainNode: GainNode | null = null;
  private _isRunning = false;

  // Pre-built PeriodicWave objects — built once at init, reused forever
  private waves: Map<TimbreKey, PeriodicWave> = new Map();
  private _currentTimbre: TimbreKey = 'warmTheremin';

  get isRunning() { return this._isRunning; }
  get currentTimbre() { return this._currentTimbre; }

  /** Expose AudioContext for GestureController fade timing */
  get audioContext(): AudioContext | null { return this.ctx; }

  /** Expose GainNode for GestureController direct fade control */
  get gainNode(): GainNode | null { return this._gainNode; }

  async init(): Promise<void> {
    this.dispose();

    // 1. Create AudioContext
    this.ctx = new AudioContext({ latencyHint: 'interactive' });

    // 2. Create GainNode
    this._gainNode = this.ctx.createGain();
    this._gainNode.gain.value = 0;

    // 3. Create OscillatorNode
    this.oscillator = this.ctx.createOscillator();

    // 4. Connect: oscillator → gain → destination
    this.oscillator.connect(this._gainNode);
    this._gainNode.connect(this.ctx.destination);

    // 5. Build ALL PeriodicWave objects from timbre profiles
    this._buildAllWaves();

    // 6. Set default timbre to warmTheremin
    const defaultWave = this.waves.get('warmTheremin');
    if (defaultWave) {
      this.oscillator.setPeriodicWave(defaultWave);
      this._currentTimbre = 'warmTheremin';
    }

    // 7. Start oscillator (runs for entire session — never stopped)
    this.oscillator.start();

    this._isRunning = true;
    console.log(`AudioEngine initialized — ${this.waves.size} timbres built, default: warmTheremin`);
  }

  /**
   * Build all 11 PeriodicWave objects from TIMBRE_PROFILES.
   */
  private _buildAllWaves(): void {
    if (!this.ctx) return;
    this.waves.clear();

    for (const [key, profile] of Object.entries(TIMBRE_PROFILES)) {
      const n = profile.harmonics.length;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);

      for (let i = 0; i < n; i++) {
        imag[i] = profile.harmonics[i];
      }

      const wave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
      this.waves.set(key as TimbreKey, wave);
    }
  }

  /**
   * Switch timbre instantly. No stops, no restarts.
   */
  setTimbre(key: TimbreKey): void {
    if (!this.oscillator) return;
    const wave = this.waves.get(key);
    if (!wave) return;
    this.oscillator.setPeriodicWave(wave);
    this._currentTimbre = key;
  }

  /**
   * Set oscillator frequency with smooth glide.
   * 50ms time constant = musical portamento + jitter suppression.
   * (Increased from 15ms to eliminate audible pitch shivering)
   */
  setFrequency(hz: number): void {
    if (!this.ctx || !this.oscillator) return;
    this.oscillator.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.05);
  }

  /**
   * Set gain with smooth ramp. Max 0.5 to prevent clipping.
   * Used by GestureController for volume control during ACTIVE state.
   */
  setVolume(vol: number): void {
    if (!this.ctx || !this._gainNode) return;
    const v = Math.max(0, Math.min(0.5, vol * 0.5));
    this._gainNode.gain.setTargetAtTime(v, this.ctx.currentTime, 0.015);
  }

  /**
   * Fade gain to target with specific time constant.
   * Used for gate transitions (CUT→ACTIVE, ACTIVE→CUT, flick, hand loss).
   * Always uses setTargetAtTime — never assigns .value directly.
   */
  fadeGainTo(target: number, timeConstant: number): void {
    if (!this.ctx || !this._gainNode) return;
    const v = Math.max(0, Math.min(0.5, target));
    this._gainNode.gain.setTargetAtTime(v, this.ctx.currentTime, timeConstant);
  }

  dispose(): void {
    try { this.oscillator?.stop(); } catch {}
    try { this.ctx?.close(); } catch {}
    this.oscillator = null;
    this._gainNode = null;
    this.ctx = null;
    this.waves.clear();
    this._isRunning = false;
  }
}
