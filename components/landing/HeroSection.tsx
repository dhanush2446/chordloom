import React, { useRef, useEffect } from 'react';

interface Props {
  onStart: () => void;
}

export const HeroSection: React.FC<Props> = ({ onStart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = (e.clientY - rect.top) / rect.height;
    };
    canvas.addEventListener('mousemove', onMove);

    const draw = (t: number) => {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const freq = 1 + mx * 4;
      const amp = 0.15 + (1 - mouseRef.current.y) * 0.25;
      const brightness = 1 - Math.abs(mx - 0.5) * 0.5;

      // Draw wave
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, `rgba(201,168,76,${0.3 * brightness})`);
      gradient.addColorStop(0.5, `rgba(226,196,106,${0.8 * brightness})`);
      gradient.addColorStop(1, `rgba(160,114,42,${0.3 * brightness})`);

      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      for (let x = 0; x <= w; x += 2) {
        const nx = x / w;
        const wave = Math.sin(nx * Math.PI * 2 * freq + t * 0.002) * amp * h * 0.4;
        const envelope = Math.sin(nx * Math.PI);
        ctx.lineTo(x, h / 2 + wave * envelope);
      }
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Glow line
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      for (let x = 0; x <= w; x += 2) {
        const nx = x / w;
        const wave = Math.sin(nx * Math.PI * 2 * freq + t * 0.002) * amp * h * 0.4;
        const envelope = Math.sin(nx * Math.PI);
        ctx.lineTo(x, h / 2 + wave * envelope);
      }
      ctx.strokeStyle = `rgba(201,168,76,${0.15 * brightness})`;
      ctx.lineWidth = 12;
      ctx.filter = 'blur(8px)';
      ctx.stroke();
      ctx.filter = 'none';

      // Static hand outline hint
      const hx = w * 0.55, hy = h * 0.45;
      ctx.beginPath();
      ctx.arc(hx, hy, 35, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(176,125,84,0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Fingertip dots
      const tips = [[-12,-30],[0,-35],[12,-30],[22,-22],[-22,-10]];
      tips.forEach(([dx,dy]) => {
        ctx.beginPath();
        ctx.arc(hx+dx, hy+dy, 3, 0, Math.PI*2);
        ctx.fillStyle = `rgba(201,168,76,${0.2 + Math.sin(t*0.003 + dx)*0.1})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section className="hero" id="hero">
      {/* Floating orbs */}
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="hero-orb hero-orb-3" />

      <div className="hero-content">
        <div>
          <p className="eyebrow anim-fade-up visible" style={{ animationDelay: '200ms', marginBottom: 16 }}>
            The Future of Electronic Music
          </p>

          <h1 className="hero-headline">
            <span className="anim-fade-up visible" style={{ display: 'block', animationDelay: '400ms' }}>Play Music</span>
            <span className="anim-fade-up visible" style={{ display: 'block', animationDelay: '500ms' }}>With Your</span>
            <span className="anim-fade-up visible text-gold-gradient" style={{ display: 'block', animationDelay: '600ms' }}>Hands</span>
          </h1>

          <p className="hero-sub anim-fade-up visible" style={{ animationDelay: '700ms' }}>
            A virtual theremin controlled by your hands and camera.
            No instrument required. Just movement, space, and sound.
          </p>

          <div className="hero-ctas anim-fade-up visible" style={{ animationDelay: '900ms' }}>
            <button className="btn-gold btn-gold-lg" onClick={onStart} id="hero-start-btn">
              Start Playing
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="btn-outline" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
              Watch Demo
            </button>
          </div>
        </div>

        <div className="hero-wave-card anim-fade-up visible" style={{ animationDelay: '600ms' }}>
          <canvas ref={canvasRef}/>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="scroll-indicator">
        <span>Scroll to explore</span>
        <svg className="scroll-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
      </div>
    </section>
  );
};
