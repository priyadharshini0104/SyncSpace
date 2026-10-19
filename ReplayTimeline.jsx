import { useEffect, useState } from "react";
import "./ReplayTimeline.css";

export default function ReplayTimeline({
  snapshots = [],
  onReplay,
  playbackSpeed = 1000,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const total = snapshots.length;
  const currentSnapshot = snapshots[currentIndex];

  useEffect(() => {
    if (total === 0) {
      setCurrentIndex(0);
      setIsPlaying(false);
      return;
    }

    setCurrentIndex((index) => Math.min(index, total - 1));
  }, [total]);

  useEffect(() => {
    if (!isPlaying || total < 2) return undefined;

    const timer = setInterval(() => {
      setCurrentIndex((index) => {
        if (index >= total - 1) {
          setIsPlaying(false);
          return index;
        }
        return index + 1;
      });
    }, playbackSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, total, playbackSpeed]);

  useEffect(() => {
    if (currentSnapshot) {
      onReplay?.(currentSnapshot, currentIndex);
    }
  }, [currentSnapshot, currentIndex, onReplay]);

  const seek = (index) => {
    if (total === 0) return;
    const nextIndex = Math.max(0, Math.min(Number(index), total - 1));
    setCurrentIndex(nextIndex);
  };

  const togglePlayback = () => {
    if (total < 2) return;

    if (currentIndex >= total - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying((playing) => !playing);
  };

  const formatTime = (value) => {
    if (!value) return "--:--:--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--:--:--";

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <section className="replay-panel">
      <div className="replay-header">
        <div>
          <h3>Session Replay</h3>
          <p>Navigate through previous session states</p>
        </div>
        <span className="replay-count">
          {total ? `${currentIndex + 1} / ${total}` : "0 / 0"}
        </span>
      </div>

      <div className="replay-timeline">
        <div className="timeline-labels">
          <span>Beginning</span>
          <span>{formatTime(currentSnapshot?.timestamp)}</span>
          <span>Latest</span>
        </div>

        <input
          className="timeline-slider"
          type="range"
          min={0}
          max={Math.max(total - 1, 0)}
          value={total ? currentIndex : 0}
          disabled={total === 0}
          onChange={(event) => {
            setIsPlaying(false);
            seek(event.target.value);
          }}
          aria-label="Session replay timeline"
        />

        <div className="timeline-markers">
          {snapshots.map((snapshot, index) => (
            <button
              key={snapshot.id ?? `${snapshot.timestamp}-${index}`}
              type="button"
              className={`timeline-marker ${
                index === currentIndex ? "active" : ""
              }`}
              title={`History step ${index + 1}`}
              aria-label={`Go to history step ${index + 1}`}
              onClick={() => {
                setIsPlaying(false);
                seek(index);
              }}
            />
          ))}
        </div>
      </div>

      <div className="replay-controls">
        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            seek(0);
          }}
          disabled={!total || currentIndex === 0}
          title="Go to beginning"
          aria-label="Go to beginning"
        >
          |◀
        </button>

        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            seek(currentIndex - 1);
          }}
          disabled={!total || currentIndex === 0}
          title="Previous step"
          aria-label="Previous step"
        >
          ◀
        </button>

        <button
          type="button"
          className="replay-play"
          onClick={togglePlayback}
          disabled={total < 2}
          title={isPlaying ? "Pause replay" : "Play replay"}
          aria-label={isPlaying ? "Pause replay" : "Play replay"}
        >
          {isPlaying ? "❚❚ Pause" : "▶ Play"}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            seek(currentIndex + 1);
          }}
          disabled={!total || currentIndex >= total - 1}
          title="Next step"
          aria-label="Next step"
        >
          ▶
        </button>

        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            seek(total - 1);
          }}
          disabled={!total || currentIndex === total - 1}
          title="Go to latest"
          aria-label="Go to latest"
        >
          ▶|
        </button>
      </div>

      <div className="replay-footer">
        <span>{isPlaying ? "Playing session..." : "Replay paused"}</span>
        <span>{total} history snapshots</span>
      </div>
    </section>
  );
}
