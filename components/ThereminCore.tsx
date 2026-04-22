import React, { useRef, useEffect } from 'react';
import { AudioEngine } from '../engine/audioEngine';
import { ThereminEngine } from '../engine/thereminEngine';
import { GestureController, GestureState } from '../engine/gestureState';
import { OctaveController } from '../engine/octaveControl';
import { MidiRecorder } from '../engine/midiExporter';
import type { TimbreKey } from '../engine/timbres';

interface Props {
  onUpdate: (
    freq: number, vol: number, note: string,
  ) => void;
  timbres: TimbreKey[];  // Orchestra mode: array of selected timbres
  settings?: { octaveSpan: number, pitchExponent: number };
  isRecording?: boolean;
  onRecordingComplete?: (blob: Blob) => void;
  onMidiComplete?: (blob: Blob) => void;
}

export const ThereminCore: React.FC<Props> = ({ onUpdate, timbres, settings, isRecording, onRecordingComplete, onMidiComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const engineRef = useRef(new ThereminEngine());
  const gestureRef = useRef(new GestureController());
  const octaveRef = useRef(new OctaveController());
  const destroyedRef = useRef(false);
  const settingsRef = useRef(settings);
  const midiRef = useRef(new MidiRecorder());
  const prevGestureStateRef = useRef<GestureState>(GestureState.INACTIVE);
  const lastFreqRef = useRef(0);
  const lastVolRef = useRef(0);
  const timbresRef = useRef(timbres);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Flick flash animation
  const flickFlashRef = useRef(0); // opacity 0–1, decays over 150ms
  const flickFlashStartRef = useRef(0);

  // Audio engine lifecycle — created ONCE
  useEffect(() => {
    const audio = new AudioEngine();
    audio.init();
    audioRef.current = audio;
    return () => { audio.dispose(); audioRef.current = null; };
  }, []);

  useEffect(() => {
    timbresRef.current = timbres;
  }, [timbres]);

  // Timbre switching (multi-timbre / orchestra mode)
  useEffect(() => {
    if (audioRef.current && audioRef.current.isRunning) {
      audioRef.current.setMultiTimbre(timbres);
    }
  }, [timbres]);

  // Recording monitor (audio + MIDI recording in sync)
  useEffect(() => {
    if (!audioRef.current) return;
    if (isRecording) {
      audioRef.current.startRecording();
      midiRef.current.startRecording();
    } else {
      // Stop MIDI recording first
      midiRef.current.stopRecording();
      if (midiRef.current.hasEvents && onMidiComplete) {
        const midiBlob = midiRef.current.exportMidi(timbresRef.current);
        onMidiComplete(midiBlob);
      }

      audioRef.current.stopRecording().then(blob => {
        if (blob && onRecordingComplete) {
          onRecordingComplete(blob);
        }
      });
    }
  }, [isRecording, onRecordingComplete, onMidiComplete]);

  // ─── MediaPipe + Camera + Processing Loop ──────────────────
  useEffect(() => {
    destroyedRef.current = false;
    let handsInstance: any = null;

    const hands = new (window as any).Hands({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.5,
    });
    handsInstance = hands;

    hands.onResults((results: any) => {
      if (destroyedRef.current || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      const { width, height } = canvasRef.current;
      const audio = audioRef.current;
      const engine = engineRef.current;
      const gesture = gestureRef.current;
      const octave = octaveRef.current;
      const now = performance.now();
      const tSec = now / 1000;

      gesture.setCanvasDimensions(width, height);

      // ── Draw: mirrored camera feed ──
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.scale(-1, 1);
      ctx.translate(-width, 0);
      ctx.filter = 'saturate(0.85)';
      ctx.globalAlpha = 0.45;
      ctx.drawImage(results.image, 0, 0, width, height);
      ctx.filter = 'none';
      ctx.globalAlpha = 1.0;

      // ── Draw: warm vignette ──
      const vignette = ctx.createRadialGradient(width/2, height/2, height*0.2, width/2, height/2, height*0.8);
      vignette.addColorStop(0, 'rgba(74,28,16,0)');
      vignette.addColorStop(1, 'rgba(74,28,16,0.25)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // ── Draw: pitch antenna (right edge) — gold ──
      const antennaGrad = ctx.createLinearGradient(3, 0, 3, height);
      antennaGrad.addColorStop(0, 'rgba(201,168,76,0)');
      antennaGrad.addColorStop(0.3, 'rgba(201,168,76,0.15)');
      antennaGrad.addColorStop(0.7, 'rgba(201,168,76,0.15)');
      antennaGrad.addColorStop(1, 'rgba(201,168,76,0)');
      ctx.strokeStyle = antennaGrad;
      ctx.lineWidth = 4;
      ctx.filter = 'blur(3px)';
      ctx.beginPath();
      ctx.moveTo(3, 0);
      ctx.lineTo(3, height);
      ctx.stroke();
      ctx.filter = 'none';

      // ── Extract hands ──
      let rightHandLm: any[] | null = null; // user's right = camera 'Left'
      let leftHandLm: any[] | null = null;  // user's left = camera 'Right'
      let rightDetected = false;
      let leftDetected = false;
      let freq = 0, vol = 0, note = '';
      let pitchProx = 0;
      let gState = GestureState.INACTIVE;
      let octBand = '';
      let pinchDist = 0;

      if (results.multiHandLandmarks && results.multiHandedness) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
          const lm = results.multiHandLandmarks[i];
          const label: string = results.multiHandedness[i].label;

          if (label === 'Left') {
            // USER'S RIGHT HAND → PITCH + GESTURES
            rightHandLm = lm;
            rightDetected = true;
          } else if (label === 'Right') {
            // USER'S LEFT HAND → OCTAVE
            leftHandLm = lm;
            leftDetected = true;
          }
        }
      }

      // ── RIGHT HAND PROCESSING ──
      if (rightDetected && rightHandLm) {
        gesture.cancelHandLoss();

        // 1. Pitch (always runs, regardless of pinch state)
        const area = ThereminEngine.computePalmArea(rightHandLm, width, height);
        const avgZ = ThereminEngine.computeAverageZ(rightHandLm);

        engine.setFieldExponent(settingsRef.current?.pitchExponent ?? 1.2);

        const r = engine.mapPitch(area, avgZ, tSec);
        freq = r.frequency;
        note = r.note;
        pitchProx = r.proximity;

        // 2. Gesture state machine (pinch + volume + flick)
        const gestureOut = gesture.update(
          rightHandLm, tSec,
          audio?.audioContext || null,
          audio?.gainNode || null,
        );
        gState = gestureOut.state;
        vol = gestureOut.volume;
        pinchDist = gestureOut.pinchDistance;

        // Handle flick flash
        if (gestureOut.flickTriggered) {
          flickFlashRef.current = 0.3;
          flickFlashStartRef.current = now;
        }

        // Draw visual feedback
        _drawGestureVisuals(ctx, rightHandLm, gestureOut, width, height);

        // Draw hand skeleton (gold — pitch hand)
        _drawHandSkeleton(ctx, rightHandLm, width, height, '#C9A84C', 0.5);

      } else {
        // Right hand lost
        gesture.onHandLost(now, audio?.audioContext || null, audio?.gainNode || null);
        gState = gesture.state;
        const lastPitch = engine.getLastPitch();
        freq = lastPitch.frequency;
        note = lastPitch.note;
      }

      // ── LEFT HAND PROCESSING ──
      if (leftDetected && leftHandLm) {
        const span = settingsRef.current?.octaveSpan ?? 0.5;
        // Point of reference for octave is average of index, middle, ring, and pinky roots (MCPs)
        const octRefY = (leftHandLm[5].y + leftHandLm[9].y + leftHandLm[13].y + leftHandLm[17].y) / 4;

        const octOut = octave.update(octRefY, timbresRef.current[0] || 'pureSine', span);
        octBand = octOut.noteName;

        // Scale pitch to selected octave
        if (freq > 0) {
          freq = OctaveController.scaleToOctave(freq, octOut.baseFrequency);
          // Update note name for scaled frequency
          note = _freqToNote(freq);
        }

        // Draw octave band lines
        _drawOctaveBands(ctx, octOut, span, width, height);

        // Draw hand skeleton (forest — octave hand)
        _drawHandSkeleton(ctx, leftHandLm, width, height, '#3A6B43', 0.5);
        const refX = (leftHandLm[5].x + leftHandLm[9].x + leftHandLm[13].x + leftHandLm[17].x) / 4;
        _drawDot(ctx, refX * width, octRefY * height, '#3A6B43');

      } else {
        // Left hand absent — default to middle octave, don't cut sound
        octBand = '';
      }

      // ── Update audio ──
      if (audio && audio.isRunning) {
        // Frequency always updates (even during CUT, per spec)
        if (freq > 0) {
          audio.setFrequency(freq);
        }
        // Volume is handled by GestureController via direct gainNode access
        // No additional setVolume call here — the state machine controls it

        // ── MIDI Recording: track note on/off from gesture state ──
        const midi = midiRef.current;
        const prevState = prevGestureStateRef.current;

        if (gState === GestureState.ACTIVE && prevState !== GestureState.ACTIVE) {
          // Pinch just closed → note ON
          if (freq > 0) {
            for (let ch = 0; ch < timbresRef.current.length; ch++) {
              midi.noteOn(freq, vol, ch);
            }
          }
        } else if (gState !== GestureState.ACTIVE && prevState === GestureState.ACTIVE) {
          // Pinch just opened → note OFF
          for (let ch = 0; ch < timbresRef.current.length; ch++) {
            midi.noteOff(ch);
          }
        } else if (gState === GestureState.ACTIVE && freq > 0) {
          // Continuous pitch update during active note
          for (let ch = 0; ch < timbresRef.current.length; ch++) {
            midi.updatePitch(freq, vol, ch);
          }
        }

        prevGestureStateRef.current = gState;
        lastFreqRef.current = freq;
        lastVolRef.current = vol;
      }

      // ── Draw: pitch antenna proximity glow (gold) ──
      if (pitchProx > 0.05) {
        const glowWidth = pitchProx * 100;
        const grad = ctx.createLinearGradient(glowWidth, 0, 0, 0);
        grad.addColorStop(0, 'rgba(201,168,76,0)');
        grad.addColorStop(1, `rgba(201,168,76,${pitchProx * 0.35})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, glowWidth, height);
      }



      // ── Draw: flick flash overlay ──
      if (flickFlashRef.current > 0.01) {
        const elapsed = now - flickFlashStartRef.current;
        flickFlashRef.current = Math.max(0, 0.3 - (elapsed / 150) * 0.3);
        ctx.fillStyle = `rgba(250,247,240,${flickFlashRef.current})`;
        ctx.fillRect(0, 0, width, height);
      }

      // ── Draw: volume position indicator (right edge circle) ──
      if (gState === GestureState.ACTIVE || gState === GestureState.CUT) {
        const volY = (1 - vol) * height;
        ctx.beginPath();
        ctx.arc(20, volY, 8, 0, Math.PI * 2);
        ctx.fillStyle = gState === GestureState.ACTIVE
          ? 'rgba(201,168,76,0.9)' : 'rgba(176,125,84,0.4)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(250,247,240,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ── Draw: state indicator text ──
      const stateColors: Record<string, string> = {
        [GestureState.INACTIVE]: 'rgba(176,125,84,0.5)',
        [GestureState.CUT]: 'rgba(125,28,58,0.7)',
        [GestureState.ACTIVE]: 'rgba(201,168,76,0.8)',
        [GestureState.FLICK_LOCK]: 'rgba(160,114,42,0.7)',
      };
      ctx.fillStyle = stateColors[gState] || 'rgba(176,125,84,0.5)';
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(gState, width - 100, 16);

      ctx.restore();
      onUpdate(freq, vol, note, gState, octBand, pinchDist);
    });

    // ── Start Camera ──
    if (videoRef.current) {
      const camera = new (window as any).Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && !destroyedRef.current) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });
      camera.start();
    }

    return () => {
      destroyedRef.current = true;
      try { handsInstance?.close(); } catch {}
    };
  }, []); // Runs ONCE



  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'rgba(74,28,16,0.05)' }}>
        <video ref={videoRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0, pointerEvents: 'none' }} playsInline />
        <canvas ref={canvasRef} width={1280} height={720} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

        {/* Zone labels */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
          <div style={{ position: 'absolute', top: 48, left: '50%', transform: 'translateX(-50%)' }}>
            <div style={{ background: 'rgba(44,82,51,0.08)', color: 'rgba(58,107,67,0.5)', padding: '6px 16px', borderRadius: 999, fontSize: 9, fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', backdropFilter: 'blur(4px)', border: '1px solid rgba(44,82,51,0.15)' }}>
              ↑ Left Hand High = High Octave &nbsp; Low = Low Octave ↓
            </div>
          </div>
          <div style={{ position: 'absolute', top: '50%', right: 16, transform: 'translateY(-50%) rotate(90deg)', transformOrigin: 'center' }}>
            <div style={{ background: 'rgba(201,168,76,0.08)', color: 'rgba(201,168,76,0.5)', padding: '6px 16px', borderRadius: 999, fontSize: 9, fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', backdropFilter: 'blur(4px)', border: '1px solid rgba(201,168,76,0.15)', whiteSpace: 'nowrap' }}>
              ← Push Closer = High Pitch &nbsp; Pull Away = Low Pitch
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Visual Feedback Drawing ──────────────────────────────────

/**
 * Draw gesture-specific visual feedback on the canvas.
 */
function _drawGestureVisuals(
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  gestureOut: any,
  w: number, h: number,
) {
  const thumb = landmarks[4];
  const index = landmarks[8];
  const thumbX = thumb.x * w;
  const thumbY = thumb.y * h;
  const indexX = index.x * w;
  const indexY = index.y * h;

  // 1. PINCH LINE — between thumb tip and index tip
  const lineColor = gestureOut.state === GestureState.ACTIVE
    ? '#C9A84C'
    : gestureOut.state === GestureState.FLICK_LOCK
      ? '#A0722A'
      : '#7D1C3A';

  ctx.beginPath();
  ctx.moveTo(thumbX, thumbY);
  ctx.lineTo(indexX, indexY);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Pinch indicator dot at midpoint
  const midX = (thumbX + indexX) / 2;
  const midY = (thumbY + indexY) / 2;
  ctx.beginPath();
  ctx.arc(midX, midY, 5, 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.fill();

  // 2. DYNAMIC RANGE BOX — default bounding box around the hand
  const upperLimitY = gestureOut.dynamicRangeUpper * h;
  const lowerLimitY = gestureOut.dynamicRangeLower * h;
  const anchorY = gestureOut.stableAnchorY * h;

  // Draw the bounding box
  const boxLeft = Math.min(thumbX, indexX) - 60;
  const boxRight = Math.max(thumbX, indexX) + 60;

  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 1.5;

  // Upper limit line
  ctx.strokeStyle = 'rgba(250,247,240,0.25)';
  ctx.beginPath();
  ctx.moveTo(boxLeft, upperLimitY);
  ctx.lineTo(boxRight, upperLimitY);
  ctx.stroke();

  // Lower limit line
  ctx.beginPath();
  ctx.moveTo(boxLeft, lowerLimitY);
  ctx.lineTo(boxRight, lowerLimitY);
  ctx.stroke();

  // Left and right sides of the box
  ctx.strokeStyle = 'rgba(250,247,240,0.12)';
  ctx.beginPath();
  ctx.moveTo(boxLeft, upperLimitY);
  ctx.lineTo(boxLeft, lowerLimitY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(boxRight, upperLimitY);
  ctx.lineTo(boxRight, lowerLimitY);
  ctx.stroke();

  ctx.setLineDash([]);

  // Anchor line (center reference, subtle)
  ctx.strokeStyle = 'rgba(250,247,240,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(boxLeft, anchorY);
  ctx.lineTo(boxRight, anchorY);
  ctx.stroke();

  // Labels
  ctx.fillStyle = 'rgba(201,168,76,0.4)';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('LOUD', boxRight + 4, upperLimitY + 3);
  ctx.fillText('QUIET', boxRight + 4, lowerLimitY + 3);

  // 3. FINGER AVG position indicator inside the box
  const fingerY = gestureOut.fingerAvgY * h;
  const fingerMarkerX = (boxLeft + boxRight) / 2;

  // Horizontal line at finger position
  ctx.strokeStyle = gestureOut.state === GestureState.ACTIVE
    ? 'rgba(201,168,76,0.6)' : 'rgba(176,125,84,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(boxLeft + 5, fingerY);
  ctx.lineTo(boxRight - 5, fingerY);
  ctx.stroke();

  // Small triangle indicator
  ctx.fillStyle = gestureOut.state === GestureState.ACTIVE
    ? 'rgba(201,168,76,0.8)' : 'rgba(176,125,84,0.4)';
  ctx.beginPath();
  ctx.moveTo(boxRight - 2, fingerY - 4);
  ctx.lineTo(boxRight + 6, fingerY);
  ctx.lineTo(boxRight - 2, fingerY + 4);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw octave band lines on the left side of the canvas.
 */
function _drawOctaveBands(
  ctx: CanvasRenderingContext2D,
  octOut: any,
  span: number,
  w: number, h: number,
) {
  const bands = octOut.bands;
  const numBands = octOut.bandCount;
  const activeBand = octOut.bandIndex;

  // Because the canvas is mirrored, x=w = physical left edge
  const edgeX = w - 10;
  const labelX = w - 30;

  const minY = 0.5 - span / 2;

  for (let i = 0; i < numBands; i++) {
    // Band boundary Y: inverted (high hand = high octave = band at top)
    const normalizedTop = 1.0 - (i + 1) / numBands;
    const normalizedBottom = 1.0 - i / numBands;

    const bandY = (minY + normalizedTop * span) * h;
    const bandBottomY = (minY + normalizedBottom * span) * h;
    const bandCenterY = (bandY + bandBottomY) / 2;

    const isActive = i === activeBand;

    // Band boundary line
    if (i > 0) {
      ctx.strokeStyle = isActive || (i - 1) === activeBand
        ? 'rgba(58,107,67,0.5)' : 'rgba(58,107,67,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(edgeX - 40, bandY);
      ctx.lineTo(edgeX, bandY);
      ctx.stroke();
    }

    // Band highlight
    if (isActive) {
      ctx.fillStyle = 'rgba(58,107,67,0.08)';
      ctx.fillRect(edgeX - 40, bandY, 40, bandBottomY - bandY);
    }

    // Band label
    ctx.fillStyle = isActive ? 'rgba(58,107,67,0.9)' : 'rgba(58,107,67,0.3)';
    ctx.font = isActive ? 'bold 11px "JetBrains Mono", monospace' : '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bands[i].note, labelX, bandCenterY);
  }
}

/** Draw a landmark dot with a glow ring */
function _drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1.0;

  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 1.0;
}

/** Draw a minimal hand skeleton for visual feedback */
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],
];

function _drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  w: number, h: number,
  color: string,
  opacity: number
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  for (const [a, b] of HAND_CONNECTIONS) {
    const ax = landmarks[a].x * w;
    const ay = landmarks[a].y * h;
    const bx = landmarks[b].x * w;
    const by = landmarks[b].y * h;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  ctx.fillStyle = color;
  for (let i = 0; i < landmarks.length; i++) {
    const lx = landmarks[i].x * w;
    const ly = landmarks[i].y * h;
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Convert frequency to note name */
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function _freqToNote(f: number): string {
  if (f <= 0) return '';
  const semi = 12 * Math.log2(f / 16.3516);
  const r = (semi + 0.5) | 0;
  const n = ((r % 12) + 12) % 12;
  const oct = (r / 12) | 0;
  return `${NOTES[n]}${oct}`;
}
