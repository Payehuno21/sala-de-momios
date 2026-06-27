export function Logo({ size = "md" }) {
  const text = { sm: "text-xl", md: "text-2xl", lg: "text-4xl" }[size];
  return (
    <div className="leading-none">
      <div className={`font-display text-gradient tracking-wide leading-none ${text}`}>
        SALA DE MOMIOS
      </div>
      <div className="text-[9px] uppercase tracking-[0.25em] text-textDim font-body font-semibold">
        Mundial 2026
      </div>
    </div>
  );
}
