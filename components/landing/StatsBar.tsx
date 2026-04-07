import React, { useRef, useEffect, useState } from 'react';

const stats = [
  { value: 20, prefix: '< ', suffix: 'ms', label: 'Audio Latency' },
  { value: 11, prefix: '', suffix: '', label: 'Instrument Timbres' },
  { value: 5, prefix: '', suffix: '', label: 'Octave Range' },
  { value: 1, prefix: '', suffix: '', label: 'Camera Needed' },
];

export const StatsBar: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [counts, setCounts] = useState(stats.map(() => 0));

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !visible) {
        setVisible(true);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const duration = 1500;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      setCounts(stats.map(s => Math.round(eased * s.value)));

      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible]);

  return (
    <section className="stats-bar" ref={ref}>
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-item" style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)', transition: `all 500ms var(--ease-musical) ${i * 100}ms` }}>
            <div className="stat-number">{s.prefix}{counts[i]}{s.suffix}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};
