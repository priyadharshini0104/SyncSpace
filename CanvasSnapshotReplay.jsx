import { useCallback, useMemo, useState } from "react";
import "./CanvasSnapshotReplay.css";

/**
 * M3: Canvas snapshot rewind UI.
 * Snapshot shape: { id, timestamp, shapes: [...] }
 * onRestore(shapes, snapshot, index) should update your existing canvas state.
 */
export default function CanvasSnapshotReplay({
  snapshots = [],
  onRestore,
  onExitReplay,
}) {
  const [index, setIndex] = useState(Math.max(0, snapshots.length - 1));

  const orderedSnapshots = useMemo(
    () => [...snapshots].sort(
      (a, b) => new Date(a.timestamp || 0).getTime() -
                new Date(b.timestamp || 0).getTime()
    ),
    [snapshots]
  );

  const currentIndex = orderedSnapshots.length
    ? Math.min(index, orderedSnapshots.length - 1)
    : 0;
  const snapshot = orderedSnapshots[currentIndex];

  const restore = useCallback((value) => {
    if (!orderedSnapshots.length) return;
    const next = Math.max(0, Math.min(Number(value), orderedSnapshots.length - 1));
    setIndex(next);
    const selected = orderedSnapshots[next];
    onRestore?.(selected.shapes ?? [], selected, next);
  }, [orderedSnapshots, onRestore]);

  const formatTime = (value) => {
    if (!value) return "Unknown time";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown time" : date.toLocaleString();
  };

  return (
    <section className="snapshot-replay">
      <header className="snapshot-replay__header">
        <div>
          <p className="snapshot-replay__eyebrow">SYNCSPACE · WEEK 4 · M3</p>
          <h2>Canvas History</h2>
          <p className="snapshot-replay__subtitle">
            Rewind the canvas to a saved snapshot.
          </p>
        </div>
        <button type="button" onClick={onExitReplay}>Exit replay</button>
      </header>

      {!orderedSnapshots.length ? (
        <div className="snapshot-replay__empty">
          No canvas snapshots yet. Save a snapshot to enable rewind.
        </div>
      ) : (
        <>
          <div className="snapshot-replay__meta">
            <span>Snapshot {currentIndex + 1} of {orderedSnapshots.length}</span>
            <span>{formatTime(snapshot?.timestamp)}</span>
          </div>

          <input
            className="snapshot-replay__slider"
            type="range"
            min="0"
            max={orderedSnapshots.length - 1}
            value={currentIndex}
            onChange={(event) => restore(event.target.value)}
            aria-label="Canvas snapshot history"
          />

          <div className="snapshot-replay__actions">
            <button type="button" onClick={() => restore(0)} disabled={currentIndex === 0}>
              First
            </button>
            <button type="button" onClick={() => restore(currentIndex - 1)} disabled={currentIndex === 0}>
              ← Previous
            </button>
            <button
              type="button"
              className="snapshot-replay__primary"
              onClick={() => restore(currentIndex + 1)}
              disabled={currentIndex >= orderedSnapshots.length - 1}
            >
              Next →
            </button>
            <button
              type="button"
              onClick={() => restore(orderedSnapshots.length - 1)}
              disabled={currentIndex >= orderedSnapshots.length - 1}
            >
              Latest
            </button>
          </div>

          <div className="snapshot-replay__details">
            <strong>Snapshot details</strong>
            <span>{Array.isArray(snapshot?.shapes) ? `${snapshot.shapes.length} canvas objects` : "No shape data"}</span>
            {snapshot?.id && <code>{snapshot.id}</code>}
          </div>
        </>
      )}
    </section>
  );
}
