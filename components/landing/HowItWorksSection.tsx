import React, { useRef, useEffect } from 'react';

const HandSVG: React.FC<{ variant: number }> = ({ variant }) => {
  const pulseStyle = { animation: 'pulse 2s ease-in-out infinite' };
  
  if (variant === 1) {
    // Pinch gesture
    return (
      <svg viewBox="0 0 200 200" width="260" height="260" fill="none">
        <g stroke="#4A1C10" strokeWidth="1.5" opacity="0.6">
          <path d="M100 170 L100 120 L80 60 L75 30" strokeWidth="2"/>
          <path d="M100 120 L110 55 L115 25"/>
          <path d="M100 120 L120 65 L130 40"/>
          <path d="M100 120 L130 80 L145 60"/>
          <path d="M100 120 L70 85 L55 100"/>
        </g>
        {/* Thumb and index meeting */}
        <circle cx="75" cy="30" r="5" fill="#C9A84C" style={pulseStyle}/>
        <circle cx="115" cy="25" r="5" fill="#C9A84C" style={pulseStyle}/>
        <line x1="75" y1="30" x2="115" y2="25" stroke="#C9A84C" strokeWidth="2.5" strokeDasharray="4 3"/>
        {/* Other fingertips */}
        <circle cx="130" cy="40" r="4" fill="rgba(201,168,76,0.4)"/>
        <circle cx="145" cy="60" r="4" fill="rgba(201,168,76,0.4)"/>
        <circle cx="55" cy="100" r="4" fill="rgba(201,168,76,0.4)"/>
        {/* Wrist */}
        <circle cx="100" cy="170" r="6" fill="rgba(176,125,84,0.3)"/>
      </svg>
    );
  }
  
  if (variant === 2) {
    // Depth gesture - hand pushing forward
    return (
      <svg viewBox="0 0 200 200" width="260" height="260" fill="none">
        <g stroke="#4A1C10" strokeWidth="1.5" opacity="0.5">
          <path d="M100 160 L100 110 L85 55 L80 30"/>
          <path d="M100 110 L100 50 L100 20"/>
          <path d="M100 110 L115 55 L120 30"/>
          <path d="M100 110 L125 70 L135 50"/>
          <path d="M100 110 L75 80 L60 95"/>
        </g>
        {/* All fingertips */}
        {[[80,30],[100,20],[120,30],[135,50],[60,95]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="4" fill="rgba(201,168,76,0.5)"/>
        ))}
        {/* Depth arrow */}
        <path d="M160 140 L160 60" stroke="#C9A84C" strokeWidth="2" markerEnd="url(#arrowG)"/>
        <path d="M160 60 L155 70 M160 60 L165 70" stroke="#C9A84C" strokeWidth="2"/>
        <text x="170" y="100" fill="#8B5E3C" fontFamily="Inter" fontSize="11" fontWeight="500">DEPTH</text>
        {/* Palm glow */}
        <circle cx="100" cy="100" r="30" fill="rgba(201,168,76,0.08)" style={pulseStyle}/>
      </svg>
    );
  }

  // Variant 3 - Three finger volume
  return (
    <svg viewBox="0 0 200 200" width="260" height="260" fill="none">
      <g stroke="#4A1C10" strokeWidth="1.5" opacity="0.5">
        <path d="M100 170 L100 120 L80 70"/>
        <path d="M100 120 L95 65"/>
        <path d="M100 120 L115 55 L120 30"/>
        <path d="M100 120 L130 60 L140 35"/>
        <path d="M100 120 L140 75 L155 55"/>
      </g>
      {/* Pinch (thumb+index) closed */}
      <circle cx="80" cy="70" r="4" fill="rgba(176,125,84,0.4)"/>
      <circle cx="95" cy="65" r="4" fill="rgba(176,125,84,0.4)"/>
      {/* Three active fingers - highlighted */}
      <circle cx="120" cy="30" r="6" fill="#C9A84C" style={pulseStyle}/>
      <circle cx="140" cy="35" r="6" fill="#C9A84C" style={{ ...pulseStyle, animationDelay: '0.2s' }}/>
      <circle cx="155" cy="55" r="6" fill="#C9A84C" style={{ ...pulseStyle, animationDelay: '0.4s' }}/>
      {/* Volume arrows */}
      <path d="M170 30 L170 70" stroke="#C9A84C" strokeWidth="1.5" strokeDasharray="3 3"/>
      <path d="M165 35 L170 28 L175 35" stroke="#C9A84C" strokeWidth="1.5" fill="none"/>
      <path d="M165 65 L170 72 L175 65" stroke="#C9A84C" strokeWidth="1.5" fill="none"/>
      <text x="160" y="20" fill="#8B5E3C" fontFamily="Inter" fontSize="9" fontWeight="500">LOUD</text>
      <text x="158" y="85" fill="#8B5E3C" fontFamily="Inter" fontSize="9" fontWeight="500">QUIET</text>
    </svg>
  );
};

const steps = [
  {
    num: '01',
    title: 'The Pinch Gate',
    desc: 'Your thumb meets your index finger — and a note begins. Separate them — and the note ends cleanly. This is your bow on the string, your breath into the flute.',
    points: [
      'Pinch to play, release to silence',
      'Scale-invariant detection works at any distance',
      'Hysteresis prevents accidental triggers',
      'Debounced for rock-solid reliability',
    ],
    variant: 1,
    reversed: false,
  },
  {
    num: '02',
    title: 'Depth Controls Pitch',
    desc: 'Push your hand toward the camera and the pitch rises. Pull it back and it falls. A non-linear response curve gives you the same expressive feel as a real theremin.',
    points: [
      'Palm area + depth fusion for precision',
      'Adaptive One-Euro filtering removes jitter',
      'Covers five full octaves: C2 to C7',
      'Automatic range calibration adapts to you',
    ],
    variant: 2,
    reversed: true,
  },
  {
    num: '03',
    title: 'Three Fingers Shape the Sound',
    desc: 'While maintaining your pinch, your middle, ring, and pinky fingers control volume independently. Raise them for louder, lower for quieter. Flick downward for an instant staccato cut.',
    points: [
      'Volume decoupled from pitch control',
      'Stable anchor follows your hand position',
      'Power curve for musical dynamic control',
      'Fast flick gesture for staccato articulation',
    ],
    variant: 3,
    reversed: false,
  },
];

export const HowItWorksSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.2 });

    const items = sectionRef.current?.querySelectorAll('.how-step');
    items?.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section className="how-section" id="how-it-works" ref={sectionRef}>
      <div className="section-header">
        <p className="eyebrow">Gestures</p>
        <h2>The Gesture Language</h2>
        <p>Three movements. Infinite expression. Learn the language of the theremin.</p>
      </div>

      {steps.map((step, i) => (
        <div key={i} className={`how-step anim-fade-up ${step.reversed ? 'reversed' : ''}`}>
          <div className="how-step-illustration">
            <HandSVG variant={step.variant} />
          </div>
          <div className="how-step-text">
            <div className="how-step-number">{step.num}</div>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
            <ul className="how-step-list">
              {step.points.map((p, j) => <li key={j}>{p}</li>)}
            </ul>
          </div>
        </div>
      ))}
    </section>
  );
};
