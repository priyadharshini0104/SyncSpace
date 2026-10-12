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
      gap: '12px',
      padding: '10px 16px',
      background: '#1e1e2e',
      color: '#fff',
      borderRadius: '8px',
      margin: '10px 0',
      border: '1px solid #3b4252'
    }}>
      <button
        onClick={togglePlay}
        style={{
          background: isPlaying ? '#ef4444' : '#10b981',
          border: 'none',
          color: '#fff',
          padding: '6px 14px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      <span style={{ fontSize: '13px', minWidth: '55px' }}>
        {currentFrame} / {totalSnapshots}
      </span>

      <input
        type="range"
        min="0"
        max={totalSnapshots}
        value={currentFrame}
        onChange={handleSliderChange}
        style={{ flex: 1, cursor: 'pointer' }}
      />

      <button
        onClick={() => { setCurrentFrame(0); if (onSeek) onSeek(0); }}
        style={{
          background: '#374151',
          border: 'none',
          color: '#d1d5db',
          padding: '6px 10px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Rewind
      </button>
    </div>
  );
};

export default SessionReplayBar;