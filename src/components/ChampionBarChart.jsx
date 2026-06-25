import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from "recharts";
import { ISO } from "../engine.js";

export function ChampionBarChart({ data }) {
  // data: [{ team, championProb }] ya ordenado descendente
  const chartData = data.map(d => ({ ...d, pct: d.championProb * 100 }));
  return (
    <div style={{ height: Math.max(220, chartData.length * 28) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 28, left: 4, bottom: 4 }}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category" dataKey="team" width={108}
            tick={{ fill: "#f5f2ea", fontSize: 12 }}
            axisLine={false} tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: "#161a22", border: "1px solid #3d3420", borderRadius: 8, fontSize: 12 }}
            formatter={(v) => [`${v.toFixed(1)}%`, "Prob. campeón"]}
            cursor={{ fill: "rgba(212,175,55,0.06)" }}
          />
          <Bar dataKey="pct" radius={0} barSize={16}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={i === 0 ? "#D4AF37" : "#7a6420"} />
            ))}
            <LabelList dataKey="pct" position="right" formatter={(v) => `${v.toFixed(1)}%`} style={{ fill: "#8a93a3", fontSize: 11 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
