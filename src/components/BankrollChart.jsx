import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";

export function BankrollChart({ curve, baseline }) {
  if (!curve || curve.length < 2) return null;
  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bankrollGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="x" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <ReferenceLine y={baseline} stroke="#3d3420" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ background: "#161a22", border: "1px solid #3d3420", borderRadius: 8, fontSize: 12 }}
            labelFormatter={() => ""}
            formatter={(v) => [`$${v.toFixed(2)}`, "Balance"]}
          />
          <Area type="monotone" dataKey="y" stroke="#34d399" strokeWidth={2.5} fill="url(#bankrollGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
