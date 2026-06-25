export function ScoreBadge({ h, a, size = "md", live = false }) {
  const dims = { sm: "text-base px-2 py-0.5", md: "text-xl px-3 py-1", lg: "text-3xl px-4 py-1.5" }[size];
  return (
    <div className={`inline-flex items-center gap-1.5 bg-ink border border-lineGold ${dims}`}>
      <span className="font-mono font-bold tabular-nums text-gold">{h ?? "–"}</span>
      <span className="text-textDim font-mono">:</span>
      <span className="font-mono font-bold tabular-nums text-gold">{a ?? "–"}</span>
      {live && <span className="w-1.5 h-1.5 rounded-full bg-loss ml-1" />}
    </div>
  );
}
