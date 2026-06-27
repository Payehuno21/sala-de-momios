export function ScoreBadge({ h, a, size = "md", live = false }) {
  const dims = { sm: "text-base px-2.5 py-1", md: "text-xl px-3.5 py-1.5", lg: "text-3xl px-5 py-2" }[size];
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-xl glass ${live ? "animate-glow-pulse" : ""} ${dims}`}>
      <span className="font-mono font-bold tabular-nums text-gradient">{h ?? "–"}</span>
      <span className="text-textDim font-mono opacity-60">:</span>
      <span className="font-mono font-bold tabular-nums text-gradient">{a ?? "–"}</span>
      {live && <span className="w-1.5 h-1.5 rounded-full bg-loss ml-1 animate-pulse" />}
    </div>
  );
}
