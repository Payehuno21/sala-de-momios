import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";

export function BankrollChart({ curve, baseline }) {
  if (!curve || curve.length < 2) return null;
  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bankrollGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34eab0" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="x" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <ReferenceLine y={baseline} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ background: "rgba(22,26,46,0.9)", border: "1px solid rgba(167,139,250,0.4)", borderRadius: 12, fontSize: 12, backdropFilter: "blur(10px)" }}
            labelFormatter={() => ""}
            formatter={(v) => [`$${v.toFixed(2)}`, "Balance"]}
          />
          <Area type="monotone" dataKey="y" stroke="#34eab0" strokeWidth={2.5} fill="url(#bankrollGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
