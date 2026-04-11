/**
 * MIDI Exporter — Pure TypeScript MIDI File Writer
 * ═══════════════════════════════════════════════════
 *
 * Records note events from the theremin's pinch gate and exports
 * Standard MIDI Format 1 files with separate tracks per instrument.
 *
 * No external dependencies — generates valid .mid files entirely
 * from first principles using the MIDI 1.0 specification.
 *
 * General MIDI Program Mapping:
 *   pureSine      → 81  (Lead 2 - Sawtooth)
 *   warmTheremin   → 82  (Lead 3 - Calliope)
 *   brightTheremin → 82  (Lead 3 - Calliope)
 *   brass          → 62  (Brass Section)
 *   mellowBrass    → 61  (French Horn)
 *   brightBrass    → 57  (Trumpet)
 *   strings        → 49  (String Ensemble 1)
 *   cello          → 43  (Cello)
 *   voice          → 55  (Voice Oohs)
 *   hollow         → 72  (Clarinet)
 *   organ          → 20  (Church Organ)
 *   acousticBrass  → 62  (Brass Section)
 */

import type { TimbreKey } from './timbres';

// ── General MIDI Program Numbers (1-indexed per spec, we store 0-indexed) ──
const GM_PROGRAM_MAP: Record<string, number> = {
  pureSine:       80,  // Lead 2 (sawtooth) — 0-indexed
  sawtooth:       81,  // Lead 3 (calliope)
  square:         80,  // Lead 2 (sawtooth)
  triangle:       80,  // Lead 2 (sawtooth)
  brightTheremin: 81,  // Lead 3 (calliope)
  brass:          61,  // Brass Section
  strings:        48,  // String Ensemble 1
  hollow:         71,  // Clarinet
  organ:          19,  // Church Organ
  acousticBrass:  61,  // Brass Section
};

// ── Note Event Types ─────────────────────────────────────────
interface NoteEvent {
  type: 'noteOn' | 'noteOff';
  timeMs: number;      // Absolute time in milliseconds since recording start
  midiNote: number;    // 0-127
  velocity: number;    // 0-127
  channel: number;     // 0-15
}

// ── Public API ───────────────────────────────────────────────

export class MidiRecorder {
  private events: NoteEvent[] = [];
  private startTime = 0;
  private _isRecording = false;
  private activeNotes: Map<number, number> = new Map(); // channel → current note

  get isRecording() { return this._isRecording; }
  get hasEvents() { return this.events.length > 0; }
  get eventCount() { return this.events.length; }

  startRecording(): void {
    this.events = [];
    this.activeNotes.clear();
    this.startTime = performance.now();
    this._isRecording = true;
  }

  stopRecording(): void {
    // Close any still-active notes
    if (this._isRecording) {
      const now = performance.now();
      for (const [channel, note] of this.activeNotes.entries()) {
        this.events.push({
          type: 'noteOff',
          timeMs: now - this.startTime,
          midiNote: note,
          velocity: 0,
          channel,
        });
      }
      this.activeNotes.clear();
    }
    this._isRecording = false;
  }

  /**
   * Record a note-on event. Automatically ends any previous note on the same channel.
   * @param frequencyHz - Current pitch in Hz
   * @param volume - 0.0 to 1.0
   * @param channel - MIDI channel (0-15)
   */
  noteOn(frequencyHz: number, volume: number, channel: number = 0): void {
    if (!this._isRecording) return;
    const now = performance.now() - this.startTime;
    const midiNote = frequencyToMidi(frequencyHz);
    const velocity = Math.max(1, Math.min(127, Math.round(volume * 127)));

    // End previous note on this channel if different pitch
    const prevNote = this.activeNotes.get(channel);
    if (prevNote !== undefined && prevNote !== midiNote) {
      this.events.push({
        type: 'noteOff',
        timeMs: now,
        midiNote: prevNote,
        velocity: 0,
        channel,
      });
    }

    // Don't re-trigger same note
    if (prevNote === midiNote) return;

    this.events.push({
      type: 'noteOn',
      timeMs: now,
      midiNote,
      velocity,
      channel,
    });
    this.activeNotes.set(channel, midiNote);
  }

  /**
   * Record a note-off event.
   * @param channel - MIDI channel (0-15)
   */
  noteOff(channel: number = 0): void {
    if (!this._isRecording) return;
    const now = performance.now() - this.startTime;
    const prevNote = this.activeNotes.get(channel);
    if (prevNote === undefined) return;

    this.events.push({
      type: 'noteOff',
      timeMs: now,
      midiNote: prevNote,
      velocity: 0,
      channel,
    });
    this.activeNotes.delete(channel);
  }

  /**
   * Update the pitch of an already-playing note (for continuous theremin pitch changes).
   * This ends the old note and starts a new one at the new pitch.
   */
  updatePitch(frequencyHz: number, volume: number, channel: number = 0): void {
    if (!this._isRecording) return;
    const midiNote = frequencyToMidi(frequencyHz);
    const prevNote = this.activeNotes.get(channel);

    // Only create a new event if the MIDI note actually changed
    if (prevNote === undefined || prevNote === midiNote) return;

    const now = performance.now() - this.startTime;
    const velocity = Math.max(1, Math.min(127, Math.round(volume * 127)));

    // End old note
    this.events.push({
      type: 'noteOff',
      timeMs: now,
      midiNote: prevNote,
      velocity: 0,
      channel,
    });

    // Start new note
    this.events.push({
      type: 'noteOn',
      timeMs: now,
      midiNote,
      velocity,
      channel,
    });
    this.activeNotes.set(channel, midiNote);
  }

  /**
   * Export recorded events as a Standard MIDI File (Format 1).
   * Each timbre gets its own track with the appropriate GM program.
   */
  exportMidi(timbres: TimbreKey[]): Blob {
    const ticksPerBeat = 480; // Standard resolution
    const bpm = 120;          // Default tempo
    const msPerTick = (60000 / bpm) / ticksPerBeat;

    // Group events by channel
    const channelEvents = new Map<number, NoteEvent[]>();
    for (const evt of this.events) {
      if (!channelEvents.has(evt.channel)) {
        channelEvents.set(evt.channel, []);
      }
      channelEvents.get(evt.channel)!.push(evt);
    }

    // Build tracks
    const tracks: Uint8Array[] = [];

    // Track 0: Tempo track (conductor track)
    tracks.push(buildTempoTrack(bpm, ticksPerBeat));

    // One track per timbre/channel
    for (let i = 0; i < timbres.length; i++) {
      const timbre = timbres[i];
      const channel = i % 16; // MIDI channels 0-15
      const events = channelEvents.get(channel) || [];
      const program = GM_PROGRAM_MAP[timbre] ?? 81;
      const trackName = getTimbreLabel(timbre);
      tracks.push(buildNoteTrack(events, channel, program, trackName, msPerTick));
    }

    // Assemble the full MIDI file
    const headerChunk = buildHeaderChunk(tracks.length, ticksPerBeat);
    const totalLength = headerChunk.length + tracks.reduce((sum, t) => sum + t.length, 0);
    const fileData = new Uint8Array(totalLength);

    let offset = 0;
    fileData.set(headerChunk, offset);
    offset += headerChunk.length;
    for (const track of tracks) {
      fileData.set(track, offset);
      offset += track.length;
    }

    return new Blob([fileData], { type: 'audio/midi' });
  }

  /** Clear all recorded events */
  clear(): void {
    this.events = [];
    this.activeNotes.clear();
    this._isRecording = false;
  }
}

// ═══════════════════════════════════════════════════════════════
//  MIDI FILE CONSTRUCTION HELPERS
// ═══════════════════════════════════════════════════════════════

/** Convert Hz to nearest MIDI note number (A4 = 69 = 440Hz) */
function frequencyToMidi(hz: number): number {
  if (hz <= 0) return 0;
  const midi = 69 + 12 * Math.log2(hz / 440);
  return Math.max(0, Math.min(127, Math.round(midi)));
}

/** MIDI header chunk: MThd */
function buildHeaderChunk(trackCount: number, ticksPerBeat: number): Uint8Array {
  const data = new Uint8Array(14);
  // "MThd"
  data[0] = 0x4D; data[1] = 0x54; data[2] = 0x68; data[3] = 0x64;
  // Length: 6
  data[4] = 0; data[5] = 0; data[6] = 0; data[7] = 6;
  // Format: 1 (multi-track)
  data[8] = 0; data[9] = 1;
  // Number of tracks
  data[10] = (trackCount >> 8) & 0xFF;
  data[11] = trackCount & 0xFF;
  // Ticks per beat
  data[12] = (ticksPerBeat >> 8) & 0xFF;
  data[13] = ticksPerBeat & 0xFF;
  return data;
}

/** Build the conductor (tempo) track */
function buildTempoTrack(bpm: number, _ticksPerBeat: number): Uint8Array {
  const usPerBeat = Math.round(60_000_000 / bpm);
  const events: number[] = [];

  // Delta time 0
  events.push(0x00);
  // Meta event: Set Tempo (FF 51 03)
  events.push(0xFF, 0x51, 0x03);
  events.push((usPerBeat >> 16) & 0xFF);
  events.push((usPerBeat >> 8) & 0xFF);
  events.push(usPerBeat & 0xFF);

  // Delta time 0
  events.push(0x00);
  // Meta event: Time Signature (FF 58 04) — 4/4 time
  events.push(0xFF, 0x58, 0x04);
  events.push(0x04); // numerator: 4
  events.push(0x02); // denominator: 2 (= 2^2 = 4)
  events.push(0x18); // clocks per click: 24
  events.push(0x08); // 32nd notes per quarter: 8

  // End of track
  events.push(0x00);
  events.push(0xFF, 0x2F, 0x00);

  return wrapTrackChunk(new Uint8Array(events));
}

/** Build a note track with program change and note events */
function buildNoteTrack(
  events: NoteEvent[],
  channel: number,
  program: number,
  trackName: string,
  msPerTick: number,
): Uint8Array {
  const bytes: number[] = [];

  // Track name meta event (delta=0)
  bytes.push(0x00);
  bytes.push(0xFF, 0x03);
  const nameBytes = stringToBytes(trackName);
  pushVarLen(bytes, nameBytes.length);
  bytes.push(...nameBytes);

  // Program change (delta=0)
  bytes.push(0x00);
  bytes.push(0xC0 | (channel & 0x0F));
  bytes.push(program & 0x7F);

  // Sort events by time
  const sorted = [...events].sort((a, b) => a.timeMs - b.timeMs);

  let prevTick = 0;
  for (const evt of sorted) {
    const absTick = Math.round(evt.timeMs / msPerTick);
    const delta = Math.max(0, absTick - prevTick);
    pushVarLen(bytes, delta);

    if (evt.type === 'noteOn') {
      bytes.push(0x90 | (channel & 0x0F));
      bytes.push(evt.midiNote & 0x7F);
      bytes.push(evt.velocity & 0x7F);
    } else {
      bytes.push(0x80 | (channel & 0x0F));
      bytes.push(evt.midiNote & 0x7F);
      bytes.push(0x00); // release velocity
    }

    prevTick = absTick;
  }

  // End of track
  bytes.push(0x00);
  bytes.push(0xFF, 0x2F, 0x00);

  return wrapTrackChunk(new Uint8Array(bytes));
}

/** Wrap raw track data in an MTrk chunk */
function wrapTrackChunk(data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(8 + data.length);
  // "MTrk"
  chunk[0] = 0x4D; chunk[1] = 0x54; chunk[2] = 0x72; chunk[3] = 0x6B;
  // Length (big-endian 32-bit)
  const len = data.length;
  chunk[4] = (len >> 24) & 0xFF;
  chunk[5] = (len >> 16) & 0xFF;
  chunk[6] = (len >> 8) & 0xFF;
  chunk[7] = len & 0xFF;
  chunk.set(data, 8);
  return chunk;
}

/** Push a variable-length quantity (VLQ) to a byte array */
function pushVarLen(arr: number[], value: number): void {
  if (value < 0) value = 0;
  const bytes: number[] = [];
  bytes.push(value & 0x7F);
  value >>= 7;
  while (value > 0) {
    bytes.push((value & 0x7F) | 0x80);
    value >>= 7;
  }
  // VLQ is big-endian (most significant byte first)
  for (let i = bytes.length - 1; i >= 0; i--) {
    arr.push(bytes[i]);
  }
}

/** Convert a string to UTF-8 bytes */
function stringToBytes(s: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(s));
}

/** Get a human-readable label for a timbre key */
function getTimbreLabel(key: TimbreKey): string {
  const labels: Record<string, string> = {
    pureSine: 'Pure Sine',
    sawtooth: 'Sawtooth',
    square: 'Square',
    triangle: 'Triangle',
    brightTheremin: 'Bright Theremin',
    brass: 'Brass',
    strings: 'Strings',
    hollow: 'Hollow',
    organ: 'Organ',
    acousticBrass: 'Acoustic Brass',
  };
  return labels[key] || key;
}

// ═══════════════════════════════════════════════════════════════
//  DOWNLOAD HELPER
// ═══════════════════════════════════════════════════════════════

/** Trigger a browser download of the MIDI blob */
export function downloadMidi(blob: Blob, filename: string = 'chord-loom-session.mid'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
