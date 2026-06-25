export function ProbabilityBar({ pH, pD, pA, labelH, labelA }) {
  const segs = [
    { label: labelH, value: pH, color: "#D4AF37" },
    { label: "EMPATE", value: pD, color: "#5b6270" },
    { label: labelA, value: pA, color: "#f87171" },
  ];
  return (
    <div>
      <div className="flex h-8 w-full overflow-hidden border border-line">
        {segs.map((s, i) => (
          <div key={i} style={{ width: `${s.value * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[12px] font-mono">
        {segs.map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-textDim text-[10px] uppercase tracking-wide">{s.label}</div>
            <div className="font-bold text-paper">{(s.value * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
