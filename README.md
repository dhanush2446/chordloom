<div align="center">

# 🎵 Chord Loom

### **Play Music with Your Hands in Thin Air**

*A gesture-controlled virtual theremin powered by computer vision and real-time audio synthesis*

[![Built with React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-4285F4?logo=google&logoColor=white)](https://google.github.io/mediapipe/solutions/hands.html)
[![Web Audio API](https://img.shields.io/badge/Web_Audio-API-FF6F00)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel&logoColor=white)](https://vercel.com)

---

**🏆 Hackathon Submission**

[🌐 Live Demo](https://chord-loom.vercel.app/) &nbsp;|&nbsp; [📹 Demo Video](https://youtu.be/wr59hrBEhA8) &nbsp;|&nbsp; [🎨 Devpost](https://devpost.com/software/chord-loom)

</div>

---

## 💡 Inspiration

Learning a musical instrument requires hundreds of hours, expensive equipment, and physical dexterity that many people lack. Theremins — the world's first electronic instrument — are controlled entirely through proximity, yet remain niche because of cost ($300+) and scarcity.

**What if you could turn any webcam into a theremin?** What if music was as accessible as waving your hand?

Chord Loom removes every barrier: no downloads, no hardware, no training — just open a browser, allow camera access, and **play**.

---

## 🎯 What It Does

Chord Loom is a **browser-based virtual theremin** that uses your webcam and hand gestures to create music in real-time:

| Hand | Control | How |
|------|---------|-----|
| 🤚 **Right hand** | **Pitch** | Move closer/farther from camera — depth maps to frequency |
| 🤏 **Left hand pinch** | **Note on/off** | Pinch thumb + index to play, release to stop |
| 🖐️ **Left hand fingers** | **Volume** | Raise/lower middle + ring + pinky fingers |
| 👇 **Left hand flick** | **Staccato** | Fast downward flick for percussive muting |

### Key Features

- **🎹 10+ Instrument Timbres** — Pure Sine, Sawtooth, Square, Triangle, Bright Theremin, Brass, Strings, Clarinet, Cathedral Organ, and Acoustic Brass (sample-based)
- **🎨 Sound Designer Studio** — Build your own instruments from scratch by tweaking harmonics, oscillators, filters, vibrato, tremolo, saturation, noise, and reverb
- **🎙️ Record & Export** — Record sessions as audio, save to the cloud, or export as **MIDI files** (.mid) for use in any DAW
- **🔐 User Accounts** — Email/password + Google OAuth sign-in; cloud-saved recordings accessible from any device
- **⚡ Zero Latency** — Sub-frame gesture response with instant pinch detection (0-frame debounce) and 1€ filter smoothing
- **📐 Scale-Invariant** — Works at any hand distance from camera using ratio-based pinch detection

---

## 🏗️ How We Built It

### Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite + TypeScript)         │
│                                                                │
│  ┌────────────┐   ┌─────────────────┐   ┌──────────────────┐  │
│  │Landing Page│   │ Instrument Page  │   │  Sound Designer  │  │
│  │ (marketing)│   │   (main play)   │   │ (custom timbres) │  │
│  └────────────┘   └────────┬────────┘   └──────────────────┘  │
│                            │                                   │
│               ┌────────────┼─────────────┐                    │
│               ▼            ▼             ▼                    │
│        ┌───────────┐  ┌──────────┐  ┌──────────┐             │
│        │MediaPipe   │  │ Gesture  │  │  Audio   │             │
│        │Hand Track  │  │Controller│  │ Engine   │             │
│        │(21 points) │  │(state m.)│  │(Web Audio│             │
│        └─────┬─────┘  └────┬─────┘  └────┬─────┘             │
│              │              │             │                    │
│              ▼              ▼             ▼                    │
│        ┌──────────────────────────────────────────┐           │
│        │  ThereminEngine (pitch mapping + fusion)  │           │
│        │  Shoelace Area · Z-Depth · 1€ Filter      │           │
│        └──────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────────┘
                             │  /api/* proxy
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                 Backend (Express + Mongoose)                    │
│                                                                │
│    Auth: register / login / Google OAuth / JWT verify           │
│    Recordings: CRUD with cloud storage in MongoDB Atlas         │
│    Deploy: Vercel Serverless Functions                          │
└────────────────────────────────────────────────────────────────┘
```

### The Audio Engine — Analog Theremin Modeling

We didn't use basic `OscillatorNode.start()`. We modeled the physics of real analog theremin circuits:

1. **3 Detuned Oscillators** — Simulates analog VCO drift, creating natural chorusing and warmth
2. **Vibrato LFO** (~5.5 Hz) — Mimics the natural hand tremor of a real theremin player
3. **WaveShaper Soft Saturation** — Adds the warm "glow" of vacuum tube circuitry
4. **Lowpass + Highpass Filters** — Simulates bandwidth limits of a tube amplifier
5. **Convolution Reverb** — Places the instrument in a realistic acoustic space
6. **Smooth Portamento** — All frequency changes glide, producing the signature theremin glissando

### Pitch Mapping Pipeline

```
Camera Frame → MediaPipe 21-Landmark Detection
      ↓
Palm Area (Shoelace formula on 6 landmarks)  +  Avg Z-Depth (21 landmarks)
      ↓
Depth Fusion: 75% Area + 25% Z
      ↓
Deadzone Filter (Δ < 0.008 → reject jitter)
      ↓
Capacitive Response Curve (power function)
      ↓
1€ Filter (minCutoff=0.4, β=0.003) → EMA Smoother (α=0.15)
      ↓
Final Frequency → Oscillators
```

### Gesture State Machine

```
INACTIVE ──► CUT ──► ACTIVE ──► FLICK_LOCK
    ▲                   │            │
    └───────────────────┴────────────┘
```

- **Scale-invariant pinch detection** using thumb-index distance ÷ wrist-to-MCP reference size
- **Hysteresis thresholds** (close: 0.22, open: 0.32) prevent jitter
- **Flick detection** via 5-frame velocity buffer with cooldown

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 19 + TypeScript | Component-based UI with type safety |
| **Build Tool** | Vite 6 | Instant HMR, lightning-fast builds |
| **Hand Tracking** | MediaPipe Hands | Production-grade 21-landmark detection at 30+ FPS |
| **Audio** | Web Audio API | Real-time synthesis with PeriodicWave, WaveShaper, BiquadFilter, ConvolverNode |
| **Signal Processing** | 1€ Filter | Low-latency jitter reduction without perceptible lag |
| **Styling** | Vanilla CSS | Custom design system (~73KB) — no framework overhead |
| **Icons** | Lucide React | Lightweight, consistent iconography |
| **Backend** | Express 5 (Node.js) | Minimal, fast REST API |
| **Database** | MongoDB Atlas (Mongoose 9) | Cloud-native document store for user data & recordings |
| **Auth** | JWT + bcryptjs + Google Auth Library | Secure session management with OAuth 2.0 |
| **Deployment** | Vercel | Serverless functions + global CDN |

---

## 🎼 Built-in Instruments

| Timbre | Character | Acoustic Modeling |
|--------|-----------|-------------------|
| **Pure Sine** | Clean, ethereal electronic | Minimal detuning, light reverb |
| **Sawtooth** | Rich, buzzing synth lead | 23 harmonics, wide detune spread |
| **Square** | Hollow, retro 8-bit | Odd harmonics only |
| **Triangle** | Soft, flute-like | Fast harmonic decay (1/n²) |
| **Bright Theremin** | Vintage RCA tube | Heavy saturation, noise injection |
| **Brass** | Rich brass ensemble | 3-voice detuned, breath noise, soft attack |
| **Strings** | Soaring violin section | Wide detune, tremolo, bow noise |
| **Hollow** | Clarinet-like woodwind | Pure odd harmonics, resonant filter |
| **Organ** | Cathedral pipe organ | Massive tremolo, high reverb |
| **Acoustic Brass** | Sample-based realism | Wavetable from recorded C3 brass sample |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 &nbsp;|&nbsp; **npm** ≥ 9
- A **MongoDB Atlas** cluster ([free tier](https://www.mongodb.com/atlas/database))
- A **Google Cloud** project with [OAuth 2.0 credentials](https://console.cloud.google.com/apis/credentials) (for Google sign-in)
- A **webcam**

### Quick Start

```bash
# 1. Clone
git clone https://github.com/hanok12-hash/ChordLoom.git
cd ChordLoom

# 2. Install dependencies
npm install
cd server && npm install && cd ..

# 3. Configure environment
cp .env.example .env
cp server/.env.example server/.env
# Edit both .env files with your credentials

# 4. Run (two terminals)
# Terminal 1 — API server
cd server && npm run dev

# Terminal 2 — Frontend
npm run dev

# 5. Open http://localhost:3001 in your browser
```

### Environment Variables

#### `.env` (project root)
```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

#### `server/.env`
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/chordloom
JWT_SECRET=your-secure-random-secret
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
PORT=3002
```

### Deploy to Vercel

```bash
vercel --prod
```

Add `MONGODB_URI`, `JWT_SECRET`, and `GOOGLE_CLIENT_ID` to your Vercel project environment variables.

---

## 📁 Project Structure

```
ChordLoom/
├── index.html              # Entry point (MediaPipe + Google SDK)
├── App.tsx                 # Root component — auth + view routing
├── index.css               # Complete design system
├── types.ts                # Shared TypeScript interfaces
│
├── engine/                 # 🧠 Core audio & gesture processing
│   ├── audioEngine.ts      # Analog-modeled synthesis (1200+ lines)
│   ├── thereminEngine.ts   # Pitch mapping with depth fusion
│   ├── gestureState.ts     # 4-state gesture controller
│   ├── timbres.ts          # 10 built-in + custom instrument system
│   ├── midiExporter.ts     # Pure-TS Standard MIDI Format 1 writer
│   ├── oneEuroFilter.ts    # 1€ Filter for signal smoothing
│   └── octaveControl.ts    # Multi-octave navigation
│
├── components/             # ⚛️ React UI
│   ├── AuthPage.tsx        # Login / Register / Google OAuth
│   ├── InstrumentPage.tsx  # Main performance interface
│   ├── ThereminCore.tsx    # MediaPipe camera loop
│   ├── SoundDesigner.tsx   # Custom instrument studio
│   ├── RecordingsModal.tsx # Cloud recordings manager
│   └── landing/            # 9 landing page sections
│
├── server/                 # 🖥️ Backend API
│   ├── index.js            # Express app (routes + MongoDB)
│   ├── routes/auth.js      # Auth endpoints
│   ├── routes/recordings.js # Recordings CRUD
│   ├── models/User.js      # User model (bcrypt hooks)
│   └── models/Recording.js # Recording model
│
├── api/index.js            # Vercel serverless adapter
└── vercel.json             # Deployment config
```

---

## 🧪 Challenges We Faced

### 1. Pitch Jitter
Raw MediaPipe landmarks oscillate between frames, causing the pitch to "shiver" between 2-3 adjacent notes. We solved this with a **multi-stage smoothing pipeline**: deadzone filter → 1€ adaptive filter → exponential moving average — achieving rock-steady pitch with minimal latency.

### 2. Scale-Invariant Pinch Detection
Initially, we used pixel-distance thresholds for pinch detection, but this broke at different hand distances. We switched to a **ratio-based approach** (thumb-index distance ÷ palm reference size), making it work at any distance from the camera.

### 3. Realistic Timbre Synthesis
Single-oscillator tones sound flat and digital. By stacking **3 detuned oscillators** with per-timbre acoustic profiles (saturation, noise injection, formant filters, tremolo), we achieved tones that genuinely resemble real instruments.

### 4. Zero-Latency Articulation
Musical expression requires instant response. We eliminated all debounce frames from pinch detection, used hysteresis instead, and set gain fade time constants to 5ms — achieving **sub-frame note on/off** response.

---

## 📜 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Create account |
| `POST` | `/api/auth/login` | — | Email/password login |
| `POST` | `/api/auth/google` | — | Google OAuth login |
| `GET` | `/api/auth/me` | 🔒 JWT | Verify token |
| `GET` | `/api/recordings` | 🔒 JWT | List recordings |
| `GET` | `/api/recordings/:id` | 🔒 JWT | Get recording + audio |
| `POST` | `/api/recordings` | 🔒 JWT | Save recording |
| `DELETE` | `/api/recordings/:id` | 🔒 JWT | Delete recording |

---

## 🔮 What's Next

- [ ] **Two-handed pitch + volume** — Both hands controlling independent parameters simultaneously
- [ ] **Collaborative jamming** — WebRTC-based multiplayer sessions
- [ ] **Scale lock mode** — Snap to pentatonic, major, minor, or custom scales
- [ ] **Mobile support** — Touch-based fallback for devices without webcam
- [ ] **Audio effects rack** — Delay, chorus, distortion, EQ pedals
- [ ] **Sheet music visualization** — Real-time staff notation of played notes

---

## 👥 Team

| Name | Role |
|------|------|
| **Dhanush Varma** | Full-Stack Developer |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ and 🎶 at [Hackathon Name]**

*No instruments were harmed in the making of this project.*

</div>
