import React, { useRef, useEffect } from 'react';

const icons = [
  // Hand gesture
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v9"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2a8 8 0 0 1-6-3l-2-3"/></svg>,
  // Sound wave
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 12h2l3-7 4 14 4-10 3 6h4"/></svg>,
  // Volume
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
  // Music note
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  // Camera
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>,
  // Zap (zero latency)
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
];

const features = [
  { title: 'Gesture Recognition', desc: 'MediaPipe precision tracking captures every subtle movement of your fingers with sub-pixel accuracy. Your hand becomes the instrument.', icon: 0 },
  { title: 'Real-Time Pitch', desc: 'Depth-based continuous pitch control maps your hand\'s distance from the camera to a smooth, expressive frequency range spanning five octaves.', icon: 1 },
  { title: 'Dynamic Volume', desc: 'Three-finger volume expression gives you nuanced dynamic control — from a whisper to full projection, independent of pitch.', icon: 2 },
  { title: '11 Timbres', desc: 'From warm theremin to brass, strings, voice, and organ — each timbre crafted with precise harmonic profiles for authentic character.', icon: 3 },
  { title: 'Octave Control', desc: 'Your left hand selects the musical register, letting you jump between octaves like switching positions on a cello\'s fingerboard.', icon: 4 },
  { title: 'Zero Latency', desc: 'Web Audio API with adaptive filtering delivers instantaneous sound response. Every gesture translates to sound within 20 milliseconds.', icon: 5 },
];

export const FeaturesSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const cards = entry.target.querySelectorAll('.feature-card');
          cards.forEach((card, i) => {
            setTimeout(() => card.classList.add('visible'), i * 100);
          });
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="features-section" id="features" ref={sectionRef}>
      <div className="section-header">
        <p className="eyebrow">Capabilities</p>
        <h2>Everything a Theremin<br/>Should Be</h2>
        <p>Six dimensions of expressive control — from gesture to sound, with nothing in between.</p>
      </div>

      <div className="features-grid">
        {features.map((f, i) => (
          <div key={i} className={`feature-card anim-fade-up`}>
            <div className="feature-icon">{icons[f.icon]}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
