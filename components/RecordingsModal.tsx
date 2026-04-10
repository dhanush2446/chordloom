import React, { useState, useEffect } from 'react';

interface RecordingInfo {
  _id: string;
  title: string;
  createdAt: string;
}

interface Props {
  onClose: () => void;
}

export const RecordingsModal: React.FC<Props> = ({ onClose }) => {
  const [recordings, setRecordings] = useState<RecordingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const token = localStorage.getItem('cl_token');
      const res = await fetch('/api/recordings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRecordings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecording = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this recording?')) return;
    try {
      const token = localStorage.getItem('cl_token');
      await fetch(`/api/recordings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRecordings(r => r.filter(x => x._id !== id));
      if (playingId === id) {
        setPlayingId(null);
        setAudioUrl(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const playRecording = async (id: string) => {
    setPlayingId(id);
    setAudioUrl(null); // Reset while loading
    try {
      const token = localStorage.getItem('cl_token');
      const res = await fetch(`/api/recordings/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAudioUrl(data.audioData);
    } catch (e) {
      console.error(e);
      setPlayingId(null);
    }
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        zIndex: 9999
      }} onClick={onClose} />
      
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'var(--color-paper)', border: '1px solid rgba(201,168,76,0.3)',
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)',
        width: 500, maxWidth: '90vw', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        zIndex: 10000, boxShadow: 'var(--shadow-2xl)',
        animation: 'slideUp 300ms cubic-bezier(0.2,0.8,0.2,1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--color-mahogany)', margin: 0 }}>My Recordings</h2>
          <button className="btn-icon" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {audioUrl && (
          <div style={{ marginBottom: 24, padding: 16, background: 'rgba(250,247,240,0.5)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-oak)' }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', color: 'var(--color-walnut)', marginBottom: 8, fontWeight: 600 }}>Now Playing</div>
            <audio src={audioUrl} controls autoPlay style={{ width: '100%', height: 40 }} />
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <span className="auth-spinner" style={{ width: 32, height: 32, borderColor: 'var(--color-gold) transparent' }} />
            </div>
          ) : recordings.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-cedar)', fontFamily: 'var(--font-body)', padding: 40 }}>
              <svg style={{ opacity: 0.5, marginBottom: 16, stroke: 'var(--color-gold)' }} width="48" height="48" viewBox="0 0 24 24" fill="none" strokeWidth="1"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              <div>No recordings saved yet.</div>
              <div style={{ fontSize: '0.85rem', marginTop: 8 }}>Use the Record button while playing to create one.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recordings.map(rec => (
                <div 
                  key={rec._id} 
                  onClick={() => playRecording(rec._id)}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 16, borderRadius: 'var(--radius-lg)',
                    background: playingId === rec._id ? 'rgba(201,168,76,0.1)' : 'transparent',
                    border: '1px solid', borderColor: playingId === rec._id ? 'var(--color-gold)' : 'var(--color-oak)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(201,168,76,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.background = playingId === rec._id ? 'rgba(201,168,76,0.1)' : 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                      width: 40, height: 40, borderRadius: '50%', 
                      background: 'var(--color-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: playingId === rec._id ? 'var(--color-gold)' : 'var(--color-walnut)',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      {playingId === rec._id && !audioUrl ? (
                         <span className="auth-spinner" style={{ width: 16, height: 16, borderColor: 'var(--color-gold) transparent', borderWidth: 2 }} />
                      ) : (
                         <svg width="20" height="20" viewBox="0 0 24 24" fill={playingId === rec._id ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      )}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, color: 'var(--color-mahogany)', marginBottom: 4 }}>{rec.title}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-cedar)' }}>
                        {new Date(rec.createdAt).toLocaleDateString()} at {new Date(rec.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <button 
                    className="btn-icon" 
                    onClick={(e) => deleteRecording(rec._id, e)}
                    style={{ color: '#d13a3a', background: 'rgba(209,58,58,0.1)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
