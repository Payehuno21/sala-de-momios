import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from "recharts";

export function ChampionBarChart({ data }) {
  // data: [{ team, championProb }] ya ordenado descendente
  const chartData = data.map(d => ({ ...d, pct: d.championProb * 100 }));
  return (
    <div style={{ height: Math.max(220, chartData.length * 28) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 28, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="barGradientTop" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category" dataKey="team" width={108}
            tick={{ fill: "#f3f1ff", fontSize: 12 }}
            axisLine={false} tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: "rgba(22,26,46,0.9)", border: "1px solid rgba(167,139,250,0.4)", borderRadius: 12, fontSize: 12, backdropFilter: "blur(10px)" }}
            formatter={(v) => [`${v.toFixed(1)}%`, "Prob. campeón"]}
            cursor={{ fill: "rgba(167,139,250,0.08)" }}
          />
          <Bar dataKey="pct" radius={8} barSize={16}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={i === 0 ? "url(#barGradientTop)" : "rgba(154,160,196,0.35)"} />
            ))}
            <LabelList dataKey="pct" position="right" formatter={(v) => `${v.toFixed(1)}%`} style={{ fill: "#9aa0c4", fontSize: 11 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
