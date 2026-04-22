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

import { TIMBRE_PROFILES, TimbreKey, TimbreAcoustics, getTimbreProfile, buildCustomTimbreProfile, CustomTimbreParams } from './timbres';

// ── Sample playback types (preserved for acousticBrass) ──────────
interface SampleBand { note: string; freq: number; }
// ── Custom Sample Playback (User's instrument.wav) ───────────────
interface SampleInstance {
  source: AudioBufferSourceNode;
  gain: GainNode;
  baseFreq: number;
}

// ── Orchestra Layer (one per selected timbre) ────────────────────
interface InstrumentLayer {
  timbreKey: TimbreKey;
  oscillators: OscillatorNode[];
  oscGains: GainNode[];
  oscMerge: GainNode;
  waveshaper: WaveShaperNode;
  lowpassFilter: BiquadFilterNode;
  highpassFilter: BiquadFilterNode;
  layerGain: GainNode;
  // ── Enhanced acoustic nodes ──
  noiseSource: AudioBufferSourceNode | null;
  noiseGain: GainNode | null;
  noiseFilter: BiquadFilterNode | null;
  tremoloLFO: OscillatorNode | null;
  tremoloGain: GainNode | null;
  formantFilters: BiquadFilterNode[];
  formantGains: GainNode[];
  formantMerge: GainNode | null;
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

  // ── Primary chain noise generator ──────────────────────────────
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;

  // ── Primary chain tremolo LFO ─────────────────────────────────
  private tremoloLFO: OscillatorNode | null = null;
  private tremoloGain: GainNode | null = null;

  // ── Primary chain formant filters (voice timbre) ───────────────
  private formantFilters: BiquadFilterNode[] = [];
  private formantGains: GainNode[] = [];
  private formantMerge: GainNode | null = null;

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

  private _currentTimbre: TimbreKey = 'pureSine';
  private _activeTimbres: TimbreKey[] = ['pureSine'];
  private _isRunning = false;

  // ── Orchestra layers ───────────────────────────────────────────
  private _layers: InstrumentLayer[] = [];

  // ── Hybrid crossfade: synth brass backing layer for acousticBrass ──
  private _hybridSynthLayer: InstrumentLayer | null = null;

  // ── Detuning values in cents for each oscillator (analog drift) ─
  // These are now PER-TIMBRE defaults, overridden by TimbreAcoustics
  private static readonly DEFAULT_OSC_DETUNE = [0, +7, -7];
  private static readonly DEFAULT_OSC_GAIN = [0.55, 0.28, 0.28];

  get isRunning() { return this._isRunning; }
  get currentTimbre() { return this._currentTimbre; }
  get activeTimbres() { return this._activeTimbres; }
  get activeTimbreCount() { return this._activeTimbres.length; }
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
    const defaultWave = this.waves.get('pureSine');
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
      gain.gain.value = AudioEngine.DEFAULT_OSC_GAIN[i];
      osc.detune.value = AudioEngine.DEFAULT_OSC_DETUNE[i];
      osc.connect(gain);
      gain.connect(this.oscMerge);
      this.oscillators.push(osc);
      this.oscGains.push(gain);
    }

    // ── Vibrato LFO ──────────────────────────────────────────────
    this.vibratoLFO = this.ctx.createOscillator();
    this.vibratoLFO.type = 'sine';
    this.vibratoLFO.frequency.value = 5.5;

    this.vibratoDepth = this.ctx.createGain();
    this.vibratoDepth.gain.value = 2.5;

    this.vibratoLFO.connect(this.vibratoDepth);
    this.oscillators.forEach(osc => {
      this.vibratoDepth!.connect(osc.detune);
    });

    // ── Noise generator (bow rosin / breath / circuit hiss) ──────
    this._buildNoiseChain();

    // ── Tremolo LFO (amplitude modulation for strings/organ) ─────
    this._buildTremoloChain();

    // ── Formant filters (vocal resonance for voice timbre) ───────
    this._buildFormantChain();
  }

  /** Create a white noise source + bandpass filter + gain node */
  private _buildNoiseChain(): void {
    if (!this.ctx || !this.synthMasterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.value = 3000;
    this.noiseFilter.Q.value = 1.0;

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0;

    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.synthMasterGain);
    this.noiseSource.start();
  }

  /** Create amplitude-modulation LFO for tremolo (strings, organ) */
  private _buildTremoloChain(): void {
    if (!this.ctx || !this.oscMerge) return;

    this.tremoloLFO = this.ctx.createOscillator();
    this.tremoloLFO.type = 'sine';
    this.tremoloLFO.frequency.value = 0.001;

    this.tremoloGain = this.ctx.createGain();
    this.tremoloGain.gain.value = 0;

    this.tremoloLFO.connect(this.tremoloGain);
    this.tremoloGain.connect(this.oscMerge.gain);
    this.tremoloLFO.start();
  }

  /** Create parallel bandpass formant filters for vocal resonance */
  private _buildFormantChain(): void {
    if (!this.ctx || !this.synthMasterGain || !this.oscMerge) return;

    this.formantMerge = this.ctx.createGain();
    this.formantMerge.gain.value = 0;
    this.formantMerge.connect(this.synthMasterGain);

    const defaultFreqs = [800, 1200, 2800];
    const defaultBWs = [80, 90, 120];
    for (let i = 0; i < 3; i++) {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = defaultFreqs[i];
      bp.Q.value = defaultFreqs[i] / defaultBWs[i];

      const g = this.ctx.createGain();
      g.gain.value = 0.3;

      this.oscMerge.connect(bp);
      bp.connect(g);
      g.connect(this.formantMerge);

      this.formantFilters.push(bp);
      this.formantGains.push(g);
    }
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

  /** Build a PeriodicWave for a custom timbre and cache it */
  buildCustomWave(key: string, harmonics: number[]): void {
    if (!this.ctx) return;
    const n = harmonics.length;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let i = 0; i < n; i++) imag[i] = harmonics[i];
    const wave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    this.waves.set(key, wave);
  }

  // ═══════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════
  //  MULTISAMPLE SAMPLER — 3 brass samples with crossfading
  //
  //  Samples: C3 (130.81Hz), C4 (261.63Hz), C5 (523.25Hz)
  //  Each sample gets a 3-voice detuned ensemble (0, +6, -6 cents).
  //  Total: 9 AudioBufferSourceNodes running simultaneously.
  //
  //  At any given pitch, we find the two bracketing samples and
  //  smoothly cosine-crossfade between them. Each sample only ever
  //  stretches ~6 semitones, staying well within natural-sounding range.
  //
  //  Signal chain per sample zone:
  //  [3 voices] → [zone gain] → [shared waveshaper] → [LP@4500] → [HP@80] → sampleMasterGain
  // ═══════════════════════════════════════════════════════════════

  private sampleBuffer: AudioBuffer | null = null;
  private sampleSources: AudioBufferSourceNode[] = [];
  private sampleGains: GainNode[] = [];

  // Each sample zone: { sources[3], gains[3], zoneGain, baseFreq }
  private _sampleZones: {
    baseFreq: number;
    sources: AudioBufferSourceNode[];
    gains: GainNode[];
    zoneGain: GainNode;
  }[] = [];

  private async _loadSamples(): Promise<void> {
    if (!this.ctx || !this.sampleMasterGain) return;
    try {
      // ── Load all 3 sample files ───────────────────────────────
      const sampleDefs = [
        { file: '/audio/C3_Brass.wav', freq: 130.81 },
        { file: '/audio/C4_Brass.wav', freq: 261.63 },
        { file: '/audio/C5_Brass.wav', freq: 523.25 },
      ];

      const buffers: AudioBuffer[] = [];
      for (const def of sampleDefs) {
        const response = await fetch(def.file);
        if (!response.ok) throw new Error(`Sample not found: ${def.file}`);
        const ab = await response.arrayBuffer();
        buffers.push(await this.ctx.decodeAudioData(ab));
      }

      // ── Shared signal chain: waveshaper → LP → HP → master ────
      const sampleWaveshaper = this.ctx.createWaveShaper();
      const drive = 1.65;
      const curveLen = 8192;
      const curve = new Float32Array(curveLen);
      for (let i = 0; i < curveLen; i++) {
        const x = (i * 2) / curveLen - 1;
        curve[i] = Math.tanh(drive * x);
      }
      sampleWaveshaper.curve = curve;
      sampleWaveshaper.oversample = '4x';

      const sampleLP = this.ctx.createBiquadFilter();
      sampleLP.type = 'lowpass';
      sampleLP.frequency.value = 4500;
      sampleLP.Q.value = 1.0;

      const sampleHP = this.ctx.createBiquadFilter();
      sampleHP.type = 'highpass';
      sampleHP.frequency.value = 80;
      sampleHP.Q.value = 0.5;

      const sampleMerge = this.ctx.createGain();
      sampleMerge.gain.value = 0.55;
      sampleMerge.connect(sampleWaveshaper);
      sampleWaveshaper.connect(sampleLP);
      sampleLP.connect(sampleHP);
      sampleHP.connect(this.sampleMasterGain);

      // ── Build 3 sample zones (each with 3 detuned voices) ─────
      const detuneCents = [0, +6, -6];

      for (let z = 0; z < sampleDefs.length; z++) {
        const zoneGain = this.ctx.createGain();
        zoneGain.gain.value = 0;
        zoneGain.connect(sampleMerge);

        const sources: AudioBufferSourceNode[] = [];
        const gains: GainNode[] = [];

        for (let v = 0; v < 3; v++) {
          const src = this.ctx.createBufferSource();
          src.buffer = buffers[z];
          src.loop = true;
          src.detune.value = detuneCents[v];

          const g = this.ctx.createGain();
          g.gain.value = [0.45, 0.35, 0.35][v]; // Initial detune spread volumes

          src.connect(g);
          g.connect(zoneGain);
          src.start();

          sources.push(src);
          gains.push(g);
          this.sampleSources.push(src);
          this.sampleGains.push(g);
        }

        this._sampleZones.push({
          baseFreq: sampleDefs[z].freq,
          sources,
          gains,
          zoneGain,
        });
      }

      this.isSampleLoaded = true;
      console.log('🎺 Multisample Brass: C3+C4+C5 (3 voices each, 9 total) + tanh(1.65x) + LP@4500/HP@80');
    } catch (e) {
      console.warn('Multisample Brass loading failed:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  setTimbre(key: TimbreKey): void {
    // Single timbre mode — delegate to multi-timbre with one key
    this.setMultiTimbre([key]);
  }

  /**
   * Orchestra Mode: Set multiple timbres to play simultaneously.
   * Each timbre gets its own oscillator stack with auto-balanced gain.
   */
  setMultiTimbre(keys: TimbreKey[]): void {
    if (!this.ctx || !this.synthMasterGain || !this.sampleMasterGain) return;
    if (keys.length === 0) keys = ['pureSine'];
    const now = this.ctx.currentTime;

    const hasAcousticBrass = keys.includes('acousticBrass');
    const synthKeys = keys.filter(k => k !== 'acousticBrass');

    // Handle acousticBrass sample layer
    if (hasAcousticBrass && this.isSampleLoaded) {
      this.sampleMasterGain.gain.setTargetAtTime(1.0, now, 0.05);
      // Sample voices start at full (crossfade will adjust in setFrequency)
      const voiceLevels = [0.45, 0.35, 0.35];
      for (let i = 0; i < this.sampleGains.length; i++) {
        this.sampleGains[i].gain.setTargetAtTime(voiceLevels[i % 3], now, 0.05);
      }
    } else {
      this.sampleMasterGain.gain.setTargetAtTime(0, now, 0.05);
      // Mute all sample voices
      for (const g of this.sampleGains) {
        g.gain.setTargetAtTime(0, now, 0.03);
      }
    }

    // Tear down old layers
    this._disposeLayers();
    this._hybridSynthLayer = null;

    // ── HYBRID CROSSFADE: build a synth 'brass' backing layer ──
    if (hasAcousticBrass && this.isSampleLoaded) {
      this.synthMasterGain.gain.setTargetAtTime(1, now, 0.05);
      const hybridLayer = this._buildLayer('brass', 0.7);
      if (hybridLayer) {
        hybridLayer.layerGain.gain.setValueAtTime(0, now);
        this._layers.push(hybridLayer);
        this._adaptLayerToTimbre(hybridLayer, 'brass', now);
        this._hybridSynthLayer = hybridLayer;
      }
    }

    if (synthKeys.length > 0) {
      this.synthMasterGain.gain.setTargetAtTime(1, now, 0.05);

      // Build a new layer for each synth timbre
      const gainPerLayer = 0.7 / keys.length; // Auto-balance to prevent clipping

      for (const key of synthKeys) {
        const layer = this._buildLayer(key, gainPerLayer);
        if (layer) {
          this._layers.push(layer);
          this._adaptLayerToTimbre(layer, key, now);
        }
      }
    } else if (!hasAcousticBrass) {
      this.synthMasterGain.gain.setTargetAtTime(0, now, 0.05);
    }

    // Also set the primary oscillators to the first synth key (backward compat)
    if (synthKeys.length > 0) {
      let wave = this.waves.get(synthKeys[0]);
      if (!wave) {
        const profile = getTimbreProfile(synthKeys[0]);
        if (profile && this.ctx) {
          this.buildCustomWave(synthKeys[0], profile.harmonics);
          wave = this.waves.get(synthKeys[0]);
        }
      }
      if (wave) {
        this.oscillators.forEach(osc => osc.setPeriodicWave(wave!));
      }
      this._adaptToTimbre(synthKeys[0], now);
    }

    this._currentTimbre = keys[0];
    this._activeTimbres = [...keys];
  }

  /** Helper: get acoustics for a timbre key */
  private _getAcoustics(key: TimbreKey): TimbreAcoustics {
    const profile = getTimbreProfile(key);
    return profile.acoustics;
  }

  /** Build an independent instrument layer with its own signal chain */
  private _buildLayer(key: TimbreKey, gainValue: number): InstrumentLayer | null {
    if (!this.ctx || !this.synthMasterGain) return null;
    const ac = this._getAcoustics(key);

    const oscMerge = this.ctx.createGain();
    oscMerge.gain.value = 0.7;

    const waveshaper = this.ctx.createWaveShaper();
    waveshaper.curve = this._generateSaturationCurve(ac.saturation);
    waveshaper.oversample = '4x';

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = ac.lpFreq;
    lowpass.Q.value = ac.lpQ;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = ac.hpFreq;
    highpass.Q.value = 0.5;

    const layerGain = this.ctx.createGain();
    layerGain.gain.value = gainValue;

    // Chain: oscMerge → waveshaper → lowpass → highpass → layerGain → synthMaster
    oscMerge.connect(waveshaper);
    waveshaper.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(layerGain);
    layerGain.connect(this.synthMasterGain);

    // Create 3 detuned oscillators for this layer using per-timbre values
    const oscillators: OscillatorNode[] = [];
    const oscGains: GainNode[] = [];

    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      gain.gain.value = ac.oscLevels[i];
      osc.detune.value = ac.detuneCents[i];
      osc.connect(gain);
      gain.connect(oscMerge);

      if (this.vibratoDepth) {
        this.vibratoDepth.connect(osc.detune);
      }

      oscillators.push(osc);
      oscGains.push(gain);
    }

    // Set the wave for this timbre (auto-build for custom timbres)
    let wave = this.waves.get(key);
    if (!wave) {
      const profile = getTimbreProfile(key);
      if (profile && this.ctx) {
        this.buildCustomWave(key, profile.harmonics);
        wave = this.waves.get(key);
      }
    }
    if (wave) {
      oscillators.forEach(osc => osc.setPeriodicWave(wave!));
    }

    // Match frequency to current primary oscillators
    if (this.oscillators.length > 0) {
      const currentFreq = this.oscillators[0].frequency.value;
      oscillators.forEach(osc => { osc.frequency.value = currentFreq; });
    }

    oscillators.forEach(osc => osc.start());

    // ── Per-layer noise generator ──
    let noiseSource: AudioBufferSourceNode | null = null;
    let noiseGainNode: GainNode | null = null;
    let noiseFilterNode: BiquadFilterNode | null = null;

    if (ac.noiseLevel > 0) {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      noiseFilterNode = this.ctx.createBiquadFilter();
      noiseFilterNode.type = 'bandpass';
      noiseFilterNode.frequency.value = ac.noiseFilterFreq;
      noiseFilterNode.Q.value = ac.noiseFilterQ;

      noiseGainNode = this.ctx.createGain();
      noiseGainNode.gain.value = ac.noiseLevel;

      noiseSource.connect(noiseFilterNode);
      noiseFilterNode.connect(noiseGainNode);
      noiseGainNode.connect(layerGain);
      noiseSource.start();
    }

    // ── Per-layer tremolo LFO ──
    let tremoloLFO: OscillatorNode | null = null;
    let tremoloGainNode: GainNode | null = null;

    if (ac.tremoloRate > 0 && ac.tremoloDepth > 0) {
      tremoloLFO = this.ctx.createOscillator();
      tremoloLFO.type = 'sine';
      tremoloLFO.frequency.value = ac.tremoloRate;

      tremoloGainNode = this.ctx.createGain();
      tremoloGainNode.gain.value = ac.tremoloDepth;

      tremoloLFO.connect(tremoloGainNode);
      tremoloGainNode.connect(oscMerge.gain);
      tremoloLFO.start();
    }

    // ── Per-layer formant filters (for voice-like instruments) ──
    const formantFilters: BiquadFilterNode[] = [];
    const formantGainsArr: GainNode[] = [];
    let formantMergeNode: GainNode | null = null;

    if (ac.formants && ac.formantBandwidths && ac.formantGains) {
      formantMergeNode = this.ctx.createGain();
      formantMergeNode.gain.value = 0.5; // Blend formant resonances
      formantMergeNode.connect(layerGain);

      for (let i = 0; i < 3; i++) {
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = ac.formants[i];
        bp.Q.value = ac.formants[i] / ac.formantBandwidths[i];

        const g = this.ctx.createGain();
        g.gain.value = ac.formantGains[i] * 0.4;

        oscMerge.connect(bp);
        bp.connect(g);
        g.connect(formantMergeNode);

        formantFilters.push(bp);
        formantGainsArr.push(g);
      }
    }

    return {
      timbreKey: key,
      oscillators,
      oscGains,
      oscMerge,
      waveshaper,
      lowpassFilter: lowpass,
      highpassFilter: highpass,
      layerGain,
      noiseSource,
      noiseGain: noiseGainNode,
      noiseFilter: noiseFilterNode,
      tremoloLFO,
      tremoloGain: tremoloGainNode,
      formantFilters,
      formantGains: formantGainsArr,
      formantMerge: formantMergeNode,
    };
  }

  /** Dispose all orchestra layers */
  private _disposeLayers(): void {
    for (const layer of this._layers) {
      layer.oscillators.forEach(osc => { try { osc.stop(); } catch { } });
      if (layer.noiseSource) { try { layer.noiseSource.stop(); } catch { } }
      if (layer.tremoloLFO) { try { layer.tremoloLFO.stop(); } catch { } }
      layer.oscMerge.disconnect();
      layer.waveshaper.disconnect();
      layer.lowpassFilter.disconnect();
      layer.highpassFilter.disconnect();
      layer.layerGain.disconnect();
      layer.noiseGain?.disconnect();
      layer.noiseFilter?.disconnect();
      layer.tremoloGain?.disconnect();
      layer.formantMerge?.disconnect();
      layer.formantFilters.forEach(f => f.disconnect());
      layer.formantGains.forEach(g => g.disconnect());
    }
    this._layers = [];
  }

  /** Adapt a layer's filter+saturation+noise+tremolo to match the timbre character */
  private _adaptLayerToTimbre(layer: InstrumentLayer, key: TimbreKey, now: number): void {
    const ac = this._getAcoustics(key);
    layer.lowpassFilter.frequency.setTargetAtTime(ac.lpFreq, now, 0.1);
    layer.lowpassFilter.Q.setTargetAtTime(ac.lpQ, now, 0.1);
    layer.highpassFilter.frequency.setTargetAtTime(ac.hpFreq, now, 0.1);
    layer.waveshaper.curve = this._generateSaturationCurve(ac.saturation);
  }

  /** Fine-tune the analog modelling per timbre (for primary oscillators) */
  private _adaptToTimbre(key: TimbreKey, now: number): void {
    if (!this.lowpassFilter || !this.vibratoDepth || !this.vibratoLFO || !this.waveshaper) return;
    const ac = this._getAcoustics(key);

    // Filter
    this.lowpassFilter.frequency.setTargetAtTime(ac.lpFreq, now, 0.1);
    this.lowpassFilter.Q.setTargetAtTime(ac.lpQ, now, 0.1);
    if (this.highpassFilter) {
      this.highpassFilter.frequency.setTargetAtTime(ac.hpFreq, now, 0.1);
    }

    // Vibrato
    this.vibratoDepth.gain.setTargetAtTime(ac.vibDepth, now, 0.1);
    this.vibratoLFO.frequency.setTargetAtTime(ac.vibRate, now, 0.1);

    // Saturation
    this.waveshaper.curve = this._generateSaturationCurve(ac.saturation);

    // Per-timbre detuning on primary oscillators
    for (let i = 0; i < this.oscillators.length && i < 3; i++) {
      this.oscillators[i].detune.setTargetAtTime(ac.detuneCents[i], now, 0.05);
    }
    for (let i = 0; i < this.oscGains.length && i < 3; i++) {
      this.oscGains[i].gain.setTargetAtTime(ac.oscLevels[i], now, 0.05);
    }

    // Noise generator
    if (this.noiseGain && this.noiseFilter) {
      this.noiseGain.gain.setTargetAtTime(ac.noiseLevel, now, 0.1);
      this.noiseFilter.frequency.setTargetAtTime(ac.noiseFilterFreq, now, 0.1);
      this.noiseFilter.Q.setTargetAtTime(ac.noiseFilterQ, now, 0.1);
    }

    // Tremolo
    if (this.tremoloLFO && this.tremoloGain) {
      if (ac.tremoloRate > 0 && ac.tremoloDepth > 0) {
        this.tremoloLFO.frequency.setTargetAtTime(ac.tremoloRate, now, 0.1);
        this.tremoloGain.gain.setTargetAtTime(ac.tremoloDepth, now, 0.1);
      } else {
        this.tremoloGain.gain.setTargetAtTime(0, now, 0.05);
        this.tremoloLFO.frequency.setTargetAtTime(0.001, now, 0.05);
      }
    }

    // Formant filters
    if (ac.formants && ac.formantBandwidths && ac.formantGains && this.formantMerge) {
      this.formantMerge.gain.setTargetAtTime(0.5, now, 0.1); // Enable formants
      for (let i = 0; i < this.formantFilters.length && i < 3; i++) {
        this.formantFilters[i].frequency.setTargetAtTime(ac.formants[i], now, 0.1);
        this.formantFilters[i].Q.setTargetAtTime(ac.formants[i] / ac.formantBandwidths[i], now, 0.1);
        this.formantGains[i].gain.setTargetAtTime(ac.formantGains[i] * 0.4, now, 0.1);
      }
    } else if (this.formantMerge) {
      // Disable formants for non-voice timbres
      this.formantMerge.gain.setTargetAtTime(0, now, 0.1);
    }

    // Reverb mix override
    if (ac.reverbMix !== null && this.wetGain && this.dryGain) {
      this.wetGain.gain.setTargetAtTime(ac.reverbMix, now, 0.15);
      this.dryGain.gain.setTargetAtTime(1.0 - ac.reverbMix, now, 0.15);
    } else if (this.wetGain && this.dryGain) {
      // Default rev mix
      this.wetGain.gain.setTargetAtTime(0.35, now, 0.15);
      this.dryGain.gain.setTargetAtTime(0.65, now, 0.15);
    }
  }

  setFrequency(hz: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Smooth portamento on all 3 primary oscillators (the signature theremin glide)
    const glideTime = 0.03; // 30ms — natural-feeling portamento
    this.oscillators.forEach(osc => {
      osc.frequency.setTargetAtTime(hz, now, glideTime);
    });

    // Portamento on all orchestra layers too
    for (const layer of this._layers) {
      layer.oscillators.forEach(osc => {
        osc.frequency.setTargetAtTime(hz, now, glideTime);
      });
      // Dynamic filter tracking per layer
      const baseFreq = 3200;
      const trackAmount = Math.max(0, (hz - 300) / 600) * 1500;
      layer.lowpassFilter.frequency.setTargetAtTime(
        Math.min(baseFreq + trackAmount, 12000),
        now, 0.08
      );
    }

    // Dynamic filter tracking for primary chain
    if (this.lowpassFilter) {
      const baseFreq = 3200;
      const trackAmount = Math.max(0, (hz - 300) / 600) * 1500;
      this.lowpassFilter.frequency.setTargetAtTime(
        Math.min(baseFreq + trackAmount, 12000),
        now, 0.08
      );
    }

    // ── MULTISAMPLE ZONE CROSSFADE ────────────────────────────────
    // 3 sample zones: C3(130.81), C4(261.63), C5(523.25)
    // For any pitch, find the two nearest zones and crossfade between
    // them via cosine interpolation.
    if (this.isSampleLoaded && this._activeTimbres.includes('acousticBrass') && this._sampleZones.length === 3) {
      const zones = this._sampleZones;
      const crossfadeTC = 0.025; // 25ms

      for (const zone of zones) {
        const rate = hz / zone.baseFreq;
        for (const src of zone.sources) {
          src.playbackRate.setTargetAtTime(rate, now, glideTime);
        }
      }

      const zoneVolumes = [0, 0, 0];
      if (hz <= zones[0].baseFreq) {
        zoneVolumes[0] = 1.0;
      } else if (hz >= zones[2].baseFreq) {
        zoneVolumes[2] = 1.0;
      } else if (hz < zones[1].baseFreq) {
        const semis = 12 * Math.log2(hz / zones[0].baseFreq);
        const t = semis / 12;
        zoneVolumes[0] = 0.5 * (1 + Math.cos(Math.PI * t));
        zoneVolumes[1] = 0.5 * (1 - Math.cos(Math.PI * t));
      } else {
        const semis = 12 * Math.log2(hz / zones[1].baseFreq);
        const t = semis / 12;
        zoneVolumes[1] = 0.5 * (1 + Math.cos(Math.PI * t));
        zoneVolumes[2] = 0.5 * (1 - Math.cos(Math.PI * t));
      }

      for (let z = 0; z < zones.length; z++) {
        zones[z].zoneGain.gain.setTargetAtTime(zoneVolumes[z], now, crossfadeTC);
      }

      const semiAboveC5 = hz > zones[2].baseFreq ? 12 * Math.log2(hz / zones[2].baseFreq) : 0;
      if (this._hybridSynthLayer && semiAboveC5 > 6) {
        const synthBlend = Math.min(1, (semiAboveC5 - 6) / 6);
        const sampleFade = 1 - synthBlend;
        this.sampleMasterGain?.gain.setTargetAtTime(sampleFade, now, crossfadeTC);
        this._hybridSynthLayer.layerGain.gain.setTargetAtTime(0.7 * synthBlend, now, crossfadeTC);
      } else {
        this.sampleMasterGain?.gain.setTargetAtTime(1.0, now, crossfadeTC);
        if (this._hybridSynthLayer) {
          this._hybridSynthLayer.layerGain.gain.setTargetAtTime(0, now, crossfadeTC);
        }
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
  //  SOUND DESIGNER PREVIEW
  // ═══════════════════════════════════════════════════════════════

  private _previewOscs: OscillatorNode[] = [];
  private _previewGains: GainNode[] = [];
  private _previewMaster: GainNode | null = null;
  private _previewWaveshaper: WaveShaperNode | null = null;
  private _previewLP: BiquadFilterNode | null = null;
  private _previewHP: BiquadFilterNode | null = null;
  private _previewNoiseSource: AudioBufferSourceNode | null = null;
  private _previewNoiseGain: GainNode | null = null;
  private _previewActive = false;

  /** Start a preview tone at the given frequency using custom params */
  startPreview(params: CustomTimbreParams, frequency: number = 440): void {
    if (!this.ctx) return;
    this.stopPreview();

    const profile = buildCustomTimbreProfile(params);
    const ac = profile.acoustics;
    const now = this.ctx.currentTime;

    // Master gain for preview
    this._previewMaster = this.ctx.createGain();
    this._previewMaster.gain.value = 0;
    this._previewMaster.connect(this.ctx.destination);

    // Waveshaper
    this._previewWaveshaper = this.ctx.createWaveShaper();
    this._previewWaveshaper.curve = this._generateSaturationCurve(ac.saturation);
    this._previewWaveshaper.oversample = '4x';

    // Filters
    this._previewLP = this.ctx.createBiquadFilter();
    this._previewLP.type = 'lowpass';
    this._previewLP.frequency.value = ac.lpFreq;
    this._previewLP.Q.value = ac.lpQ;

    this._previewHP = this.ctx.createBiquadFilter();
    this._previewHP.type = 'highpass';
    this._previewHP.frequency.value = ac.hpFreq;
    this._previewHP.Q.value = 0.5;

    // Chain: oscs → waveshaper → LP → HP → master
    this._previewWaveshaper.connect(this._previewLP);
    this._previewLP.connect(this._previewHP);
    this._previewHP.connect(this._previewMaster);

    // Build PeriodicWave
    const n = profile.harmonics.length;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let i = 0; i < n; i++) imag[i] = profile.harmonics[i];
    const wave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });

    // 3 detuned oscillators
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.setPeriodicWave(wave);
      osc.frequency.value = frequency;
      osc.detune.value = ac.detuneCents[i];
      gain.gain.value = ac.oscLevels[i];
      osc.connect(gain);
      gain.connect(this._previewWaveshaper!);
      osc.start();
      this._previewOscs.push(osc);
      this._previewGains.push(gain);
    }

    // Noise
    if (ac.noiseLevel > 0) {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      this._previewNoiseSource = this.ctx.createBufferSource();
      this._previewNoiseSource.buffer = noiseBuffer;
      this._previewNoiseSource.loop = true;
      this._previewNoiseGain = this.ctx.createGain();
      this._previewNoiseGain.gain.value = ac.noiseLevel;
      const nf = this.ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = ac.noiseFilterFreq;
      nf.Q.value = 1.0;
      this._previewNoiseSource.connect(nf);
      nf.connect(this._previewNoiseGain);
      this._previewNoiseGain.connect(this._previewMaster);
      this._previewNoiseSource.start();
    }

    // Fade in
    this._previewMaster.gain.setTargetAtTime(0.25, now, 0.05);
    this._previewActive = true;
  }

  /** Update preview parameters live (while preview is playing) */
  updatePreview(params: CustomTimbreParams, frequency: number = 440): void {
    if (!this._previewActive || !this.ctx) {
      this.startPreview(params, frequency);
      return;
    }
    // Rebuild — simple approach: stop and restart
    this.stopPreview();
    this.startPreview(params, frequency);
  }

  /** Stop the preview tone */
  stopPreview(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this._previewMaster) {
      this._previewMaster.gain.setTargetAtTime(0, now, 0.03);
    }

    // Schedule cleanup after fade out
    setTimeout(() => {
      for (const osc of this._previewOscs) {
        try { osc.stop(); } catch {}
      }
      if (this._previewNoiseSource) {
        try { this._previewNoiseSource.stop(); } catch {}
      }
      this._previewOscs = [];
      this._previewGains = [];
      this._previewWaveshaper?.disconnect();
      this._previewLP?.disconnect();
      this._previewHP?.disconnect();
      this._previewMaster?.disconnect();
      this._previewNoiseGain?.disconnect();
      this._previewWaveshaper = null;
      this._previewLP = null;
      this._previewHP = null;
      this._previewMaster = null;
      this._previewNoiseSource = null;
      this._previewNoiseGain = null;
      this._previewActive = false;
    }, 100);
  }

  get isPreviewActive() { return this._previewActive; }

  // ═══════════════════════════════════════════════════════════════
  //  CLEANUP
  // ═══════════════════════════════════════════════════════════════

  dispose(): void {
    // Dispose orchestra layers first
    this._disposeLayers();

    this.oscillators.forEach(osc => { try { osc.stop(); } catch { } });
    try { this.vibratoLFO?.stop(); } catch { }
    try { this.noiseSource?.stop(); } catch { }
    try { this.tremoloLFO?.stop(); } catch { }
    for (const inst of this.sampleInstances.values()) {
      try { inst.source.stop(); } catch { }
    }
    try { this.ctx?.close(); } catch { }

    this.oscillators = [];
    this.oscGains = [];
    this.oscMerge = null;
    this.vibratoLFO = null;
    this.vibratoDepth = null;
    this.noiseSource = null;
    this.noiseGain = null;
    this.noiseFilter = null;
    this.tremoloLFO = null;
    this.tremoloGain = null;
    this.formantFilters = [];
    this.formantGains = [];
    this.formantMerge = null;
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
    this.sampleSources = [];
    this.sampleGains = [];
    this._sampleZones = [];
    this._hybridSynthLayer = null;
    this._isRunning = false;
  }
}
