import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_URL } from '../config/api';

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
      const res = await fetch(`${API_URL}/api/recordings`, {
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
      await fetch(`${API_URL}/api/recordings/${id}`, {
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
      const res = await fetch(`${API_URL}/api/recordings/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAudioUrl(data.audioData);
    } catch (e) {
      console.error(e);
      setPlayingId(null);
    }
  };

  const downloadDbAudio = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setPlayingId(id); // Show spinner temporarily
      const token = localStorage.getItem('cl_token');
      const res = await fetch(`${API_URL}/api/recordings/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPlayingId(null);
      
      if (!data.audioData) {
        alert('Cannot download audio for this session.');
        return;
      }
      
      // audioData is a direct browser-playable data URI (e.g. data:audio/webm;codecs=opus;base64,.....)
      const a = document.createElement('a');
      a.href = data.audioData;
      
      // We'll guess the extension based on the MIME. Default to webm.
      const mimeMatch = data.audioData.match(/^data:([^;]+);/);
      let ext = 'webm';
      if (mimeMatch) {
          if (mimeMatch[1].includes('mp4')) ext = 'mp4';
          if (mimeMatch[1].includes('ogg')) ext = 'ogg';
          if (mimeMatch[1].includes('wav')) ext = 'wav';
      }
      
      a.download = `session-audio-${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      setPlayingId(null);
    }
  };

  const downloadDbMidi = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setPlayingId(id); // Show spinner temporarily
      const token = localStorage.getItem('cl_token');
      const res = await fetch(`${API_URL}/api/recordings/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPlayingId(null);
      
      if (!data.midiData) {
        alert('No MIDI data found for this older session.');
        return;
      }
      
      const [_, base64] = data.midiData.split(',');
      const byteString = atob(base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'audio/midi' });
      
      const fileName = `session-${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mid`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setPlayingId(null);
    }
  };

  return createPortal(
    <>
      {/* Modal Backdrop */}
      <div className="recording-modal-backdrop" onClick={onClose} />
      
      <div 
        className="recording-modal" 
        style={{ width: 500, maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Close Button */}
        <button className="recording-modal-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        {/* Modal Icon (Music Note instead of floppy disk) */}
        <div className="recording-modal-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </div>

        <h2 className="recording-modal-title">My Recordings</h2>
        <p className="recording-modal-desc" style={{ marginBottom: 16 }}>
          Listen to or manage your past performances.
        </p>

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button 
                      className="btn-icon" 
                      onClick={(e) => downloadDbAudio(rec._id, rec.title, e)}
                      title="Download Audio (Waveform)"
                      style={{ color: 'var(--color-gold)', background: 'rgba(201,168,76,0.1)' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                      </svg>
                    </button>
                    <button 
                      className="btn-icon" 
                      onClick={(e) => downloadDbMidi(rec._id, rec.title, e)}
                      title="Download MIDI (Notes)"
                      style={{ color: 'var(--color-wood)', background: 'rgba(176,125,84,0.1)' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                    <button 
                      className="btn-icon" 
                      onClick={(e) => deleteRecording(rec._id, e)}
                      title="Delete recording"
                      style={{ color: '#d13a3a', background: 'rgba(209,58,58,0.1)' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};
