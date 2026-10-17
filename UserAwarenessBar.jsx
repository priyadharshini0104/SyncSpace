import React from "react";
import "./M2Awareness.css";

const COLORS = ["#7c3aed", "#0891b2", "#16a34a", "#ea580c", "#db2777", "#2563eb"];

export default function UserAwarenessBar({ users = [], currentName = "" }) {
  const members = Array.isArray(users) ? users : [];
  return (
    <section className="m2-awareness-bar" aria-label="Room members">
      <div className="m2-awareness-title">
        <span className="m2-online-indicator" />
        <strong>Room members</strong>
        <span className="m2-member-count">{members.length}</span>
      </div>
      <div className="m2-awareness-list">
        {members.length === 0 ? <span className="m2-empty-members">Waiting for members…</span> :
          members.map((user, i) => {
            const name = user?.name || user?.username || user?.userName || "User";
            const you = currentName.trim().toLowerCase() === name.trim().toLowerCase();
            return (
              <div className="m2-member" key={user?.id || `${name}-${i}`} title={name}>
                <span className="m2-avatar" style={{ "--m2-user-color": COLORS[i % COLORS.length] }}>
                  {name.trim().charAt(0).toUpperCase() || "U"}<span className="m2-avatar-online" />
                </span>
                <span className="m2-member-name">{name}{you && <small> (you)</small>}</span>
              </div>
            );
          })}
      </div>
    </section>
  );
}
