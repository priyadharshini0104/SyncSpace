import React from "react";
import "./M2Awareness.css";

const COLORS = ["#7c3aed", "#0891b2", "#16a34a", "#ea580c", "#db2777", "#2563eb"];

export default function RemoteCursorOverlay({ cursors = {}, boardWidth = 800, boardHeight = 600 }) {
  const list = Array.isArray(cursors) ? cursors :
    cursors && typeof cursors === "object" ? Object.values(cursors) : [];

  return (
    <div className="m2-cursor-overlay" style={{ width: boardWidth, height: boardHeight }} aria-hidden="true">
      {list.filter(c => c && c.id != null && Number.isFinite(Number(c.x)) && Number.isFinite(Number(c.y)))
        .map((cursor, i) => {
          const name = cursor.name || cursor.username || "User";
          const x = Math.max(0, Math.min(boardWidth - 1, Number(cursor.x)));
          const y = Math.max(0, Math.min(boardHeight - 1, Number(cursor.y)));
          return (
            <div key={cursor.id} className="m2-remote-cursor"
              style={{ left: x, top: y, "--m2-user-color": COLORS[i % COLORS.length] }}>
              <svg width="18" height="22" viewBox="0 0 18 22" className="m2-cursor-arrow">
                <path d="M1 1 L1 17 L5.2 13.2 L9 20.5 L12 18.8 L8.2 12.2 L15.5 12.2 Z"
                  fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
              </svg>
              <span className="m2-cursor-label">{name}</span>
            </div>
          );
        })}
    </div>
  );
}
