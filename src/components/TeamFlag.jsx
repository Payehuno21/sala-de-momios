import { ISO } from "../engine.js";

export function TeamFlag({ team, size = "text-base", showName = true, className = "" }) {
  const iso = ISO[team];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {iso ? <span className={`fi fi-${iso}`} /> : <span>—</span>}
      {showName && <span className={size}>{team}</span>}
    </span>
  );
}
