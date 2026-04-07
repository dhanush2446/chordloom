import React from 'react';

const mockCards = [
  {
    title: 'Playing Interface',
    bg: 'linear-gradient(135deg, var(--color-ivory) 0%, var(--color-cream) 100%)',
    content: (
      <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Mock camera feed bg */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(74,28,16,0.08), rgba(74,28,16,0.15))', borderRadius: 'inherit' }}/>
        {/* Mock hand dots */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
            <circle cx="40" cy="30" r="4" fill="var(--color-gold)" opacity="0.7"/>
            <circle cx="55" cy="25" r="4" fill="var(--color-gold)" opacity="0.7"/>
            <line x1="40" y1="30" x2="55" y2="25" stroke="var(--color-gold)" strokeWidth="2"/>
            <circle cx="65" cy="35" r="3" fill="var(--color-gold)" opacity="0.4"/>
            <circle cx="75" cy="45" r="3" fill="var(--color-gold)" opacity="0.4"/>
            <circle cx="80" cy="55" r="3" fill="var(--color-gold)" opacity="0.4"/>
            <rect x="0" y="85" width="120" height="4" rx="2" fill="var(--color-parchment)" opacity="0.5"/>
            <circle cx="50" cy="87" r="5" fill="var(--color-gold)"/>
          </svg>
        </div>
        {/* Mock note display */}
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(250,247,240,0.8)', borderRadius: 16, padding: '6px 20px', textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: 'var(--color-gold)' }}>A4</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-cedar)', marginLeft: 8 }}>440 Hz</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Hand Tracking',
    bg: 'linear-gradient(135deg, var(--color-cream) 0%, var(--color-parchment) 100%)',
    content: (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="160" height="140" viewBox="0 0 160 140" fill="none">
          {/* Skeleton lines */}
          <g stroke="var(--color-gold)" strokeWidth="1.5" opacity="0.5">
            <path d="M80 120 L80 80 L65 40 L60 15"/>
            <path d="M80 80 L80 35 L80 10"/>
            <path d="M80 80 L95 40 L100 15"/>
            <path d="M80 80 L105 50 L115 30"/>
            <path d="M80 80 L55 65 L40 80"/>
          </g>
          {/* Landmark dots */}
          {[[60,15],[80,10],[100,15],[115,30],[40,80],[80,120],[80,80],[65,40],[80,35],[95,40],[105,50],[55,65]].map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r={i<5 ? 4 : 3} fill="var(--color-gold)" opacity={i<5 ? 0.9 : 0.4}/>
          ))}
        </svg>
      </div>
    ),
  },
  {
    title: 'Timbre Selector',
    bg: 'linear-gradient(135deg, var(--color-warm-white) 0%, var(--color-cream) 100%)',
    content: (
      <div style={{ width: '100%', height: '100%', padding: 16, display: 'flex', gap: 12 }}>
        <div style={{ flex: '0 0 100px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {['Sine', 'Warm', 'Bright', 'Brass', 'Strings'].map((t, i) => (
            <div key={i} style={{ padding: '5px 8px', borderRadius: 6, fontSize: 10, fontFamily: 'var(--font-ui)', background: i === 1 ? 'rgba(201,168,76,0.15)' : 'transparent', color: i === 1 ? 'var(--color-mahogany)' : 'var(--color-cedar)', fontWeight: i === 1 ? 600 : 400, borderLeft: i === 1 ? '3px solid var(--color-gold)' : '3px solid transparent' }}>
              {t}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, background: 'var(--color-parchment)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="120" height="40" viewBox="0 0 120 40">
            <path d="M0 20 Q15 5 30 20 T60 20 T90 20 T120 20" stroke="var(--color-gold)" strokeWidth="2" fill="none"/>
          </svg>
        </div>
      </div>
    ),
  },
  {
    title: 'Octave Control',
    bg: 'linear-gradient(135deg, var(--color-parchment) 0%, var(--color-ivory) 100%)',
    content: (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        {/* Vertical octave track */}
        <div style={{ width: 24, height: 100, background: 'var(--color-cream)', borderRadius: 12, position: 'relative', border: '1px solid rgba(201,168,76,0.2)' }}>
          {['C6','C5','C4','C3','C2'].map((n,i) => (
            <div key={i} style={{ position: 'absolute', top: `${i * 25}%`, left: -30, fontSize: 9, fontFamily: 'var(--font-mono)', color: i===2 ? 'var(--color-gold)' : 'var(--color-cedar)', fontWeight: i===2 ? 600 : 400 }}>{n}</div>
          ))}
          {/* Active indicator */}
          <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%,-50%)', width: 14, height: 14, borderRadius: '50%', background: 'var(--color-gold)', boxShadow: 'var(--shadow-gold-sm)' }}/>
        </div>
        {/* Info */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, color: 'var(--color-gold)' }}>C4</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-cedar)' }}>261.63 Hz</div>
        </div>
      </div>
    ),
  },
];

export const GallerySection: React.FC = () => {
  return (
    <section className="gallery-section" id="gallery">
      <div className="section-header">
        <p className="eyebrow">Interface</p>
        <h2>In Motion</h2>
        <p>A glimpse of the instrument's visual language.</p>
      </div>

      <div className="gallery-grid">
        {mockCards.map((card, i) => (
          <div key={i} className="gallery-card" style={{ background: card.bg }}>
            <div className="gallery-card-inner">
              {card.content}
            </div>
            <div style={{ position: 'absolute', bottom: 12, left: 16, fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 500, color: 'var(--color-cedar)', zIndex: 1 }}>
              {card.title}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
