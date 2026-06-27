export function ProbabilityBar({ pH, pD, pA, labelH, labelA }) {
  const segs = [
    { label: labelH, value: pH, gradient: "linear-gradient(135deg, #22d3ee, #0ea5c4)" },
    { label: "EMPATE", value: pD, gradient: "linear-gradient(135deg, #6b7299, #4c5278)" },
    { label: labelA, value: pA, gradient: "linear-gradient(135deg, #f472d0, #ff5f8f)" },
  ];
  return (
    <div>
      <div className="flex h-9 w-full overflow-hidden rounded-xl border border-line">
        {segs.map((s, i) => (
          <div key={i} className="transition-all duration-700 ease-out" style={{ width: `${s.value * 100}%`, background: s.gradient }} />
        ))}
      </div>
      <div className="flex justify-between mt-2.5 text-[12px] font-mono">
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
