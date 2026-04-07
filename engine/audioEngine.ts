/**
 * Web Audio Synthesis Engine v11 — Sampler & Synth Hybrid
 * ═══════════════════════════════════════════════════════
 *
 * Supports both mathematical `PeriodicWave` timbres AND pre-rendered multi-sampled buffers.
 * Switching between synth and sampler is seamless.
 */

import { TIMBRE_PROFILES, TimbreKey } from './timbres';

interface SampleBand {
  note: string;
  freq: number;
}

const SAMPLE_BANDS: SampleBand[] = [
  { note: 'C1', freq: 32.70 },
  { note: 'C2', freq: 65.41 },
  { note: 'C3', freq: 130.81 },
  { note: 'C4', freq: 261.63 },
  { note: 'C5', freq: 523.25 }
];

interface SampleInstance {
  source: AudioBufferSourceNode;
  gain: GainNode;
  baseFreq: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  
  // Master gesture gain
  private _gestureGainNode: GainNode | null = null;
  
  // Sub-busses
  private synthMasterGain: GainNode | null = null;
  private sampleMasterGain: GainNode | null = null;

  // Synthesizer
  private oscillator: OscillatorNode | null = null;
  private waves: Map<TimbreKey, PeriodicWave> = new Map();

  // Sampler
  private sampleInstances: Map<string, SampleInstance> = new Map();
  private isSampleLoaded = false;

  private _currentTimbre: TimbreKey = 'warmTheremin';
  private _isRunning = false;

  get isRunning() { return this._isRunning; }
  get currentTimbre() { return this._currentTimbre; }
  get audioContext(): AudioContext | null { return this.ctx; }
  get gainNode(): GainNode | null { return this._gestureGainNode; }

  async init(): Promise<void> {
    this.dispose();

    // 1. Create AudioContext
    this.ctx = new AudioContext({ latencyHint: 'interactive' });

    // 2. Create Master Gesture Gain (controlled by hand volume/flick)
    this._gestureGainNode = this.ctx.createGain();
    this._gestureGainNode.gain.value = 0;
    this._gestureGainNode.connect(this.ctx.destination);

    // 3. Create Sub-busses 
    this.synthMasterGain = this.ctx.createGain();
    this.synthMasterGain.gain.value = 1; // Default to synth
    this.synthMasterGain.connect(this._gestureGainNode);

    this.sampleMasterGain = this.ctx.createGain();
    this.sampleMasterGain.gain.value = 0;
    this.sampleMasterGain.connect(this._gestureGainNode);

    // 4. Init Synthesizer
    this.oscillator = this.ctx.createOscillator();
    this.oscillator.connect(this.synthMasterGain);
    this._buildAllWaves();
    const defaultWave = this.waves.get('warmTheremin');
    if (defaultWave) this.oscillator.setPeriodicWave(defaultWave);
    this.oscillator.start();

    // 5. Init Sampler
    await this._loadSamples();

    this._isRunning = true;
    console.log(`AudioEngine initialized — ${this.waves.size} synth timbres, ${this.sampleInstances.size} sample buffers.`);
  }

  private _buildAllWaves(): void {
    if (!this.ctx) return;
    this.waves.clear();

    for (const [key, profile] of Object.entries(TIMBRE_PROFILES)) {
      if (key === 'acousticBrass') continue; // Don't build a wave for the sampler

      const n = profile.harmonics.length;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);

      for (let i = 0; i < n; i++) imag[i] = profile.harmonics[i];

      const wave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
      this.waves.set(key as TimbreKey, wave);
    }
  }

  private async _loadSamples(): Promise<void> {
    if (!this.ctx || !this.sampleMasterGain) return;
    try {
      for (const band of SAMPLE_BANDS) {
        const response = await fetch(`/audio/Instrument_${band.note}.wav`);
        if (!response.ok) continue;
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        
        const source = this.ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;
        
        const gainNode = this.ctx.createGain();
        gainNode.gain.value = 0; // Muted by default
        
        source.connect(gainNode);
        gainNode.connect(this.sampleMasterGain);
        source.start(); // Start continuously running in background
        
        this.sampleInstances.set(band.note, { source, gain: gainNode, baseFreq: band.freq });
      }
      this.isSampleLoaded = this.sampleInstances.size > 0;
    } catch (e) {
      console.warn("Failed to load acoustic brass samples. Is the script run?", e);
    }
  }

  setTimbre(key: TimbreKey): void {
    if (!this.ctx || !this.synthMasterGain || !this.sampleMasterGain) return;
    const now = this.ctx.currentTime;

    if (key === 'acousticBrass') {
      // Crossfade to sampler
      this.synthMasterGain.gain.setTargetAtTime(0, now, 0.05);
      if (this.isSampleLoaded) {
        this.sampleMasterGain.gain.setTargetAtTime(1, now, 0.05);
      }
    } else {
      // Crossfade to synth
      this.sampleMasterGain.gain.setTargetAtTime(0, now, 0.05);
      this.synthMasterGain.gain.setTargetAtTime(1, now, 0.05);
      
      const wave = this.waves.get(key);
      if (wave && this.oscillator) {
        this.oscillator.setPeriodicWave(wave);
      }
    }
    this._currentTimbre = key;
  }

  setFrequency(hz: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Update Synthesizer
    if (this.oscillator) {
      this.oscillator.frequency.setTargetAtTime(hz, now, 0.05);
    }

    // 2. Update Sampler (crossfade to closest band and bend playbackRate)
    if (this.sampleInstances.size > 0) {
      // Find closest band
      let bestBand = SAMPLE_BANDS[2]; // Default C3
      let minRatio = Infinity;
      for (const band of SAMPLE_BANDS) {
        const ratio = Math.max(hz / band.freq, band.freq / hz);
        if (ratio < minRatio) {
          minRatio = ratio;
          bestBand = band;
        }
      }

      // Update all sampler nodes
      for (const [note, instance] of this.sampleInstances) {
        // Bend pitch via playback rate
        const rate = hz / instance.baseFreq;
        instance.source.playbackRate.setTargetAtTime(rate, now, 0.05);
        
        // Only output audio from the 'best' band (seamless crossfade on note crossing)
        if (note === bestBand.note) {
          instance.gain.gain.setTargetAtTime(1.0, now, 0.05);
        } else {
          instance.gain.gain.setTargetAtTime(0, now, 0.05);
        }
      }
    }
  }

  setVolume(vol: number): void {
    if (!this.ctx || !this._gestureGainNode) return;
    const v = Math.max(0, Math.min(0.5, vol * 0.5));
    this._gestureGainNode.gain.setTargetAtTime(v, this.ctx.currentTime, 0.015);
  }

  fadeGainTo(target: number, timeConstant: number): void {
    if (!this.ctx || !this._gestureGainNode) return;
    const v = Math.max(0, Math.min(0.5, target));
    this._gestureGainNode.gain.setTargetAtTime(v, this.ctx.currentTime, timeConstant);
  }

  dispose(): void {
    try { this.oscillator?.stop(); } catch {}
    for (const inst of this.sampleInstances.values()) {
      try { inst.source.stop(); } catch {}
    }
    try { this.ctx?.close(); } catch {}
    this.oscillator = null;
    this._gestureGainNode = null;
    this.synthMasterGain = null;
    this.sampleMasterGain = null;
    this.ctx = null;
    this.waves.clear();
    this.sampleInstances.clear();
    this._isRunning = false;
  }
}
