/**
 * Web Audio Synthesis Engine v12 — Analog-Modelled Theremin
 * ═════════════════════════════════════════════════════════
 *
 * Rebuilt from scratch to produce a naturally warm, hauntingly beautiful
 * theremin tone by modelling the physics of real analog theremin circuits:
 *
 * 1. MULTI-OSCILLATOR STACK: 3 slightly detuned oscillators (like real
 *    analog VCO drift) create natural chorusing and warmth.
 *
 * 2. VIBRATO LFO: Subtle pitch modulation (~5.5 Hz) mimics the natural
 *    hand tremor of a real theremin player.
 *
 * 3. LOW-PASS FILTER: Rolls off harsh digital harmonics above ~3kHz,
 *    simulating the bandwidth limits of a tube amplifier.
 *
 * 4. WAVESHAPER (SOFT SATURATION): Subtle harmonic distortion adds
 *    the warm "glow" of vacuum tube circuitry.
 *
 * 5. CONVOLUTION REVERB (algorithmic fallback): Places the instrument
 *    in a realistic acoustic space — theremins ALWAYS sound better with reverb.
 *
 * 6. SMOOTH PORTAMENTO: All frequency changes glide with configurable
 *    time constants, producing the signature theremin glissando.
 *
 * Signal chain:
 *   [Osc1+Osc2+Osc3] → [WaveShaper] → [LowPass Filter] → [Dry/Wet Mixer]
 *       ↑ LFO vibrato                                      ↓       ↓
 *                                                       [Reverb] [Dry]
 *                                                          ↓       ↓
 *                                                      [GestureGain] → [Destination]
 */

import { TIMBRE_PROFILES, TimbreKey } from './timbres';

// ── Sample playback types (preserved for acousticBrass) ──────────
interface SampleBand { note: string; freq: number; }
// ── Custom Sample Playback (User's instrument.wav) ───────────────
interface SampleInstance {
  source: AudioBufferSourceNode;
  gain: GainNode;
  baseFreq: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;

  // ── Master output ──────────────────────────────────────────────
  private _gestureGainNode: GainNode | null = null;

  // ── Multi-oscillator stack (the real magic) ────────────────────
  private oscillators: OscillatorNode[] = [];
  private oscGains: GainNode[] = [];
  private oscMerge: GainNode | null = null;

  // ── Vibrato LFO ────────────────────────────────────────────────
  private vibratoLFO: OscillatorNode | null = null;
  private vibratoDepth: GainNode | null = null;

  // ── Tone shaping ───────────────────────────────────────────────
  private waveshaper: WaveShaperNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  private highpassFilter: BiquadFilterNode | null = null;

  // ── Reverb ─────────────────────────────────────────────────────
  private reverbConvolver: ConvolverNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;

  // ── Sub-busses ─────────────────────────────────────────────────
  private synthMasterGain: GainNode | null = null;
  private sampleMasterGain: GainNode | null = null;

  // ── Sampler (acousticBrass only) ───────────────────────────────
  private sampleInstances: Map<string, SampleInstance> = new Map();
  private isSampleLoaded = false;

  // ── Recording ──────────────────────────────────────────────────
  private destNode: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // ── Timbre waves ───────────────────────────────────────────────
  private waves: Map<TimbreKey, PeriodicWave> = new Map();

  private _currentTimbre: TimbreKey = 'warmTheremin';
  private _isRunning = false;

  // ── Detuning values in cents for each oscillator (analog drift) ─
  private static readonly OSC_DETUNE = [0, +7, -7]; // centre, sharp, flat
  private static readonly OSC_GAIN   = [0.55, 0.28, 0.28]; // centre dominates

  get isRunning() { return this._isRunning; }
  get currentTimbre() { return this._currentTimbre; }
  get audioContext(): AudioContext | null { return this.ctx; }
  get gainNode(): GainNode | null { return this._gestureGainNode; }

  // ═══════════════════════════════════════════════════════════════
  //  INITIALISATION
  // ═══════════════════════════════════════════════════════════════

  async init(): Promise<void> {
    this.dispose();

    // 1. AudioContext
    this.ctx = new AudioContext({ latencyHint: 'interactive' });

    // 2. Master gesture gain (controlled by hand proximity)
    this._gestureGainNode = this.ctx.createGain();
    this._gestureGainNode.gain.value = 0;
    this._gestureGainNode.connect(this.ctx.destination);

    // 3. Build the analog-modelled signal chain
    this._buildSignalChain();

    // 4. Build PeriodicWaves for all timbres
    this._buildAllWaves();

    // 5. Set default wave on all oscillators
    const defaultWave = this.waves.get('warmTheremin');
    if (defaultWave) {
      this.oscillators.forEach(osc => osc.setPeriodicWave(defaultWave));
    }

    // 6. Start oscillators + LFO
    this.oscillators.forEach(osc => osc.start());
    this.vibratoLFO?.start();

    // 7. Init sampler for acousticBrass
    await this._loadSamples();

    this._isRunning = true;
    console.log(`🎵 AudioEngine v12 initialized — ${this.oscillators.length} oscillators, analog modelling active`);
  }

  // ═══════════════════════════════════════════════════════════════
  //  SIGNAL CHAIN CONSTRUCTION
  // ═══════════════════════════════════════════════════════════════

  private _buildSignalChain(): void {
    if (!this.ctx || !this._gestureGainNode) return;

    // ── Sub-busses for synth vs. sampler ──────────────────────────
    this.synthMasterGain = this.ctx.createGain();
    this.synthMasterGain.gain.value = 1;

    this.sampleMasterGain = this.ctx.createGain();
    this.sampleMasterGain.gain.value = 0;

    // ── Reverb (wet/dry mix) ─────────────────────────────────────
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 0.65; // 65% dry
    this.wetGain = this.ctx.createGain();
    this.wetGain.gain.value = 0.35; // 35% wet reverb

    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = this._generateReverbIR(2.8, 3.0); // 2.8s tail, decay 3.0

    // Route: synthMaster → dry → gestureGain
    //        synthMaster → reverb → wet → gestureGain
    this.synthMasterGain.connect(this.dryGain);
    this.synthMasterGain.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.wetGain);
    this.dryGain.connect(this._gestureGainNode);
    this.wetGain.connect(this._gestureGainNode);

    // Sampler bypasses the synth distortion, but STILL goes into reverb/mix!
    this.sampleMasterGain.connect(this.dryGain);
    this.sampleMasterGain.connect(this.reverbConvolver);

    // ── Low-pass filter (tube amp bandwidth simulation) ──────────
    this.lowpassFilter = this.ctx.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.value = 3200; // Natural roll-off
    this.lowpassFilter.Q.value = 0.7; // Gentle slope

    // ── High-pass filter (remove sub-bass rumble) ────────────────
    this.highpassFilter = this.ctx.createBiquadFilter();
    this.highpassFilter.type = 'highpass';
    this.highpassFilter.frequency.value = 60;
    this.highpassFilter.Q.value = 0.5;

    // ── Waveshaper (soft saturation / tube warmth) ───────────────
    this.waveshaper = this.ctx.createWaveShaper();
    this.waveshaper.curve = this._generateSaturationCurve(0.4); // Subtle warmth
    this.waveshaper.oversample = '4x'; // Anti-alias the distortion

    // ── Oscillator merge bus ─────────────────────────────────────
    this.oscMerge = this.ctx.createGain();
    this.oscMerge.gain.value = 0.7; // Prevent clipping from 3 stacked oscs

    // Chain: oscMerge → waveshaper → lowpass → highpass → synthMaster
    this.oscMerge.connect(this.waveshaper);
    this.waveshaper.connect(this.lowpassFilter);
    this.lowpassFilter.connect(this.highpassFilter);
    this.highpassFilter.connect(this.synthMasterGain);

    // ── Create 3 detuned oscillators ─────────────────────────────
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      gain.gain.value = AudioEngine.OSC_GAIN[i];
      osc.detune.value = AudioEngine.OSC_DETUNE[i];
      osc.connect(gain);
      gain.connect(this.oscMerge);
      this.oscillators.push(osc);
      this.oscGains.push(gain);
    }

    // ── Vibrato LFO ──────────────────────────────────────────────
    // Real theremin players have natural hand tremor ~5-6 Hz
    this.vibratoLFO = this.ctx.createOscillator();
    this.vibratoLFO.type = 'sine';
    this.vibratoLFO.frequency.value = 5.5; // Hz — natural tremor rate

    this.vibratoDepth = this.ctx.createGain();
    this.vibratoDepth.gain.value = 2.5; // Cents of pitch wobble (very subtle)

    this.vibratoLFO.connect(this.vibratoDepth);
    // Connect vibrato to each oscillator's detune parameter
    this.oscillators.forEach(osc => {
      this.vibratoDepth!.connect(osc.detune);
    });
  }

  // ── Generate algorithmic reverb impulse response ───────────────
  private _generateReverbIR(duration: number, decay: number): AudioBuffer {
    if (!this.ctx) throw new Error('No AudioContext');
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const channel = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        // Exponentially decaying white noise with early reflections
        const t = i / sampleRate;
        const envelope = Math.exp(-t * decay);
        // Add early reflections (discrete echoes in first 80ms)
        const earlyReflection = t < 0.08
          ? Math.sin(t * 400) * 0.3 * (1 - t / 0.08)
          : 0;
        channel[i] = ((Math.random() * 2 - 1) * envelope + earlyReflection) * 0.5;
      }
    }
    return buffer;
  }

  // ── Soft saturation curve (simulates warm vacuum tube clipping) ─
  private _generateSaturationCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const k = amount * 50; // Drive amount

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; // -1 to +1
      // Soft-clip using tanh — mimics real tube transfer function
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    return curve;
  }

  // ═══════════════════════════════════════════════════════════════
  //  WAVE CONSTRUCTION
  // ═══════════════════════════════════════════════════════════════

  private _buildAllWaves(): void {
    if (!this.ctx) return;
    this.waves.clear();

    for (const [key, profile] of Object.entries(TIMBRE_PROFILES)) {
      if (key === 'acousticBrass') continue;

      const n = profile.harmonics.length;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);
      for (let i = 0; i < n; i++) imag[i] = profile.harmonics[i];

      const wave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
      this.waves.set(key as TimbreKey, wave);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  SAMPLER (User's Custom Brass C3)
  // ═══════════════════════════════════════════════════════════════

  private async _loadSamples(): Promise<void> {
    if (!this.ctx || !this.sampleMasterGain) return;
    try {
      // The user specified that instrument.wav is a C3 Brass note. C3 = 130.81 Hz.
      const response = await fetch('/audio/C3_Brass.wav');
      if (!response.ok) throw new Error('User instrument.wav not found at /audio/C3_Brass.wav');
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      
      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true; // Seamless loop!
      
      const gainNode = this.ctx.createGain();
      gainNode.gain.value = 0; // Muted by default
      
      source.connect(gainNode);
      gainNode.connect(this.sampleMasterGain);
      source.start();
      
      // Store it using 'brass' as key to maintain previous lookup
      this.sampleInstances.set('brass_c3', { source, gain: gainNode, baseFreq: 130.81 });
      this.isSampleLoaded = true;
      console.log('🎺 Custom C3 Brass Instrument (instrument.wav) loaded perfectly.');
    } catch (e) {
      console.warn('Real Brass Sample loading skipped or failed:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  setTimbre(key: TimbreKey): void {
    if (!this.ctx || !this.synthMasterGain || !this.sampleMasterGain) return;
    const now = this.ctx.currentTime;

    if (key === 'acousticBrass') {
      this.synthMasterGain.gain.setTargetAtTime(0, now, 0.05);
      if (this.isSampleLoaded) {
        this.sampleMasterGain.gain.setTargetAtTime(1, now, 0.05);
      }
    } else {
      this.sampleMasterGain.gain.setTargetAtTime(0, now, 0.05);
      this.synthMasterGain.gain.setTargetAtTime(1, now, 0.05);

      const wave = this.waves.get(key);
      if (wave) {
        this.oscillators.forEach(osc => osc.setPeriodicWave(wave));
      }

      // Adapt filter and vibrato per timbre character
      this._adaptToTimbre(key, now);
    }
    this._currentTimbre = key;
  }

  /** Fine-tune the analog modelling per timbre */
  private _adaptToTimbre(key: TimbreKey, now: number): void {
    if (!this.lowpassFilter || !this.vibratoDepth || !this.vibratoLFO || !this.waveshaper) return;

    switch (key) {
      case 'pureSine':
        this.lowpassFilter.frequency.setTargetAtTime(2000, now, 0.1);
        this.vibratoDepth.gain.setTargetAtTime(1.5, now, 0.1);
        this.waveshaper.curve = this._generateSaturationCurve(0.15);
        break;
      case 'warmTheremin':
        this.lowpassFilter.frequency.setTargetAtTime(3200, now, 0.1);
        this.vibratoDepth.gain.setTargetAtTime(2.5, now, 0.1);
        this.waveshaper.curve = this._generateSaturationCurve(0.4);
        break;
      case 'brightTheremin':
        this.lowpassFilter.frequency.setTargetAtTime(5000, now, 0.1);
        this.vibratoDepth.gain.setTargetAtTime(3.0, now, 0.1);
        this.waveshaper.curve = this._generateSaturationCurve(0.5);
        break;
      case 'brass':
      case 'brightBrass':
        this.lowpassFilter.frequency.setTargetAtTime(6000, now, 0.1);
        this.vibratoDepth.gain.setTargetAtTime(4.0, now, 0.1);
        this.waveshaper.curve = this._generateSaturationCurve(0.6);
        break;
      case 'mellowBrass':
        this.lowpassFilter.frequency.setTargetAtTime(2800, now, 0.1);
        this.vibratoDepth.gain.setTargetAtTime(2.0, now, 0.1);
        this.waveshaper.curve = this._generateSaturationCurve(0.35);
        break;
      case 'strings':
      case 'cello':
        this.lowpassFilter.frequency.setTargetAtTime(4500, now, 0.1);
        this.vibratoDepth.gain.setTargetAtTime(5.0, now, 0.1); // More vibrato for strings
        this.vibratoLFO.frequency.setTargetAtTime(6.2, now, 0.1); // Faster vibrato
        this.waveshaper.curve = this._generateSaturationCurve(0.3);
        break;
      case 'voice':
        this.lowpassFilter.frequency.setTargetAtTime(3800, now, 0.1);
        this.vibratoDepth.gain.setTargetAtTime(6.0, now, 0.1); // Vocal vibrato
        this.vibratoLFO.frequency.setTargetAtTime(5.8, now, 0.1);
        this.waveshaper.curve = this._generateSaturationCurve(0.45);
        break;
      case 'hollow':
        this.lowpassFilter.frequency.setTargetAtTime(2500, now, 0.1);
        this.vibratoDepth.gain.setTargetAtTime(1.8, now, 0.1);
        this.waveshaper.curve = this._generateSaturationCurve(0.2);
        break;
      case 'organ':
        this.lowpassFilter.frequency.setTargetAtTime(5500, now, 0.1);
        this.vibratoDepth.gain.setTargetAtTime(3.5, now, 0.1);
        this.vibratoLFO.frequency.setTargetAtTime(6.8, now, 0.1); // Leslie effect
        this.waveshaper.curve = this._generateSaturationCurve(0.55);
        break;
      default:
        // Safe defaults
        this.lowpassFilter.frequency.setTargetAtTime(3200, now, 0.1);
        this.vibratoDepth.gain.setTargetAtTime(2.5, now, 0.1);
    }
  }

  setFrequency(hz: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Smooth portamento on all 3 oscillators (the signature theremin glide)
    const glideTime = 0.03; // 30ms — natural-feeling portamento
    this.oscillators.forEach(osc => {
      osc.frequency.setTargetAtTime(hz, now, glideTime);
    });

    // Dynamic filter tracking: open filter more for higher notes
    if (this.lowpassFilter) {
      const baseFreq = 3200;
      const trackAmount = Math.max(0, (hz - 300) / 600) * 1500;
      this.lowpassFilter.frequency.setTargetAtTime(
        Math.min(baseFreq + trackAmount, 12000),
        now, 0.08
      );
    }

    // Update sampler portamento
    if (this.sampleInstances.size > 0 && this._currentTimbre === 'acousticBrass') {
      const instance = this.sampleInstances.get('brass_c3');
      if (instance) {
        // Pitch shift exactly from the C3 base frequency!
        // To preserve audio fidelity while bending, we smoothly glide playbackRate.
        const rate = hz / instance.baseFreq;
        instance.source.playbackRate.setTargetAtTime(rate, now, glideTime);
        
        // Ensure volume is up
        instance.gain.gain.setTargetAtTime(1.0, now, 0.05);
      }
    }
  }

  setVolume(vol: number): void {
    if (!this.ctx || !this._gestureGainNode) return;
    // Slightly higher ceiling for richer tone
    const v = Math.max(0, Math.min(0.6, vol * 0.6));
    this._gestureGainNode.gain.setTargetAtTime(v, this.ctx.currentTime, 0.015);
  }

  fadeGainTo(target: number, timeConstant: number): void {
    if (!this.ctx || !this._gestureGainNode) return;
    const v = Math.max(0, Math.min(0.6, target));
    this._gestureGainNode.gain.setTargetAtTime(v, this.ctx.currentTime, timeConstant);
  }

  // ═══════════════════════════════════════════════════════════════
  //  RECORDING INTERFACE (unchanged)
  // ═══════════════════════════════════════════════════════════════

  startRecording(): void {
    if (!this.ctx || !this._gestureGainNode) return;
    this.destNode = this.ctx.createMediaStreamDestination();
    this._gestureGainNode.connect(this.destNode);
    const stream = this.destNode.stream;
    try {
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    } catch {
      this.mediaRecorder = new MediaRecorder(stream);
    }
    this.recordedChunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };
    this.mediaRecorder.start(100);
  }

  stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.recordedChunks = [];
        if (this.destNode) {
          this._gestureGainNode?.disconnect(this.destNode);
          this.destNode = null;
        }
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  CLEANUP
  // ═══════════════════════════════════════════════════════════════

  dispose(): void {
    this.oscillators.forEach(osc => { try { osc.stop(); } catch {} });
    try { this.vibratoLFO?.stop(); } catch {}
    for (const inst of this.sampleInstances.values()) {
      try { inst.source.stop(); } catch {}
    }
    try { this.ctx?.close(); } catch {}

    this.oscillators = [];
    this.oscGains = [];
    this.oscMerge = null;
    this.vibratoLFO = null;
    this.vibratoDepth = null;
    this.waveshaper = null;
    this.lowpassFilter = null;
    this.highpassFilter = null;
    this.reverbConvolver = null;
    this.dryGain = null;
    this.wetGain = null;
    this.synthMasterGain = null;
    this.sampleMasterGain = null;
    this._gestureGainNode = null;
    this.ctx = null;
    this.waves.clear();
    this.sampleInstances.clear();
    this._isRunning = false;
  }
}
