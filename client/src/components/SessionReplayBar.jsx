import React, { useState, useEffect } from 'react';

const SessionReplayBar = ({ totalSnapshots = 100, onSeek, onPlayToggle }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentFrame((prev) => {
          if (prev >= totalSnapshots) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          if (onSeek) onSeek(next);
          return next;
        });
      }, 250);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalSnapshots, onSeek]);

  const handleSliderChange = (e) => {
    const frame = Number(e.target.value);
    setCurrentFrame(frame);
    if (onSeek) onSeek(frame);
  };

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (onPlayToggle) onPlayToggle(nextState);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '8px 20px',
      background: '#ffffff',
      color: '#000000',
      borderRadius: '9999px',
      margin: '6px 0',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: '#10b981',
          display: 'inline-block'
        }} />
        <span className="caption" style={{ color: '#6b7280', fontSize: '10px' }}>
          SESSION REPLAY
        </span>
      </div>

      <button
        onClick={togglePlay}
        className="button-primary"
        style={{
          padding: '5px 14px',
          fontSize: '12px',
          borderRadius: '9999px',
          backgroundColor: isPlaying ? '#e11d48' : '#000000',
          color: '#ffffff'
        }}
      >
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>

      <span style={{
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '12px',
        color: '#374151',
        minWidth: '70px',
        fontWeight: '500'
      }}>
        {currentFrame.toString().padStart(2, '0')} / {totalSnapshots}
      </span>

      <input
        type="range"
        min="0"
        max={totalSnapshots}
        value={currentFrame}
        onChange={handleSliderChange}
        style={{
          flex: 1,
          cursor: 'pointer',
          accentColor: '#000000'
        }}
      />

      <button
        onClick={() => { setCurrentFrame(0); if (onSeek) onSeek(0); }}
        className="button-secondary"
        style={{
          padding: '5px 12px',
          fontSize: '12px',
          borderRadius: '9999px'
        }}
      >
        ⏮ Rewind
      </button>
    </div>
  );
};

export default SessionReplayBar;