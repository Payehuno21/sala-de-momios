import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#D4AF37", "#8a93a3", "#f87171"];

export function ProbabilityDonut({ pH, pD, pA, labelH, labelA }) {
  const data = [
    { name: labelH, value: pH * 100 },
    { name: "Empate", value: pD * 100 },
    { name: labelA, value: pA * 100 },
  ];
  return (
    <div className="relative" style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data} dataKey="value" nameKey="name"
            innerRadius={58} outerRadius={82} paddingAngle={2}
            startAngle={90} endAngle={-270}
            stroke="#0a0c10" strokeWidth={2}
          >
            {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#161a22", border: "1px solid #3d3420", borderRadius: 8, fontSize: 12 }}
            itemStyle={{ color: "#f5f2ea" }}
            formatter={(v) => `${v.toFixed(1)}%`}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-[10px] uppercase tracking-wider text-textDim">Más probable</div>
        <div className="font-display text-gold text-2xl leading-none mt-0.5">
          {Math.max(pH, pD, pA) === pH ? labelH : Math.max(pH, pD, pA) === pD ? "EMPATE" : labelA}
        </div>
        <div className="font-mono text-sm text-paper mt-0.5">{(Math.max(pH, pD, pA) * 100).toFixed(0)}%</div>
      </div>
    </div>
  );
}
