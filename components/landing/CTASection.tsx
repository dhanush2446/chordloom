import React, { useRef, useEffect } from 'react';

interface Props {
  onLaunch: () => void;
}

export const CTASection: React.FC<Props> = ({ onLaunch }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Particles
    const particles: { x: number; y: number; speed: number; size: number; opacity: number }[] = [];
    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        speed: 0.0002 + Math.random() * 0.0005,
        size: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.4,
      });
    }

    let animId = 0;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      particles.forEach((p) => {
        p.y -= p.speed * 16;
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = Math.random();
        }

        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 168, 76, ${p.opacity})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    animId = requestAnimationFrame(draw);

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section className="cta-section" id="cta">
      <canvas ref={canvasRef}/>

      {/* Gold ornament */}
      <div className="cta-content">
        <svg width="80" height="20" viewBox="0 0 80 20" fill="none" style={{ margin: '0 auto 24px' }}>
          <path d="M0 10 Q20 0 40 10 T80 10" stroke="var(--color-gold-pale)" strokeWidth="1.5" opacity="0.6"/>
        </svg>

        <h2>Ready to Play?</h2>
        <p className="sub">
          Your hands are the only instrument you need.
          Step into the sound.
        </p>

        <button className="btn-gold btn-gold-lg" onClick={onLaunch} style={{ margin: '0 auto' }}>
          Start Playing
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>

        <p className="note">
          Works in Chrome and Edge. Camera access required.
        </p>
      </div>
    </section>
  );
};
