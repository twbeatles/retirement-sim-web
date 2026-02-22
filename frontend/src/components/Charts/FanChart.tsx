import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Line
} from "recharts";
import type { SimulationTrajectoryStats } from "../../logic/types";

function fmt(n: number) {
  if (!isFinite(n)) return "-";
  return Math.round(n / 10000).toLocaleString() + "만";
}

function fmtFull(n: number) {
  if (!isFinite(n)) return "-";
  return Math.round(n).toLocaleString();
}

const axisStyle = { fontSize: "0.75rem" };
const legendStyle = { fontSize: "0.8rem" };

export const FanChart = React.memo(function FanChart({ stats }: { stats: SimulationTrajectoryStats }) {
  const data = React.useMemo(() => {
    const arr = [];
    const step = stats.month.length > 200 ? 6 : 1;
    for (let i = 0; i < stats.month.length; i += step) {
      arr.push({
        month: stats.month[i],
        range90: [stats.p10[i], stats.p90[i]],
        range50: [stats.p25[i], stats.p75[i]],
        p50: stats.p50[i]
      });
    }
    return arr;
  }, [stats]);

  return (
    <div className="chart-box chart-box-md">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tickFormatter={(m) => `${Math.floor(m / 12)}y`} style={axisStyle} />
          <YAxis tickFormatter={fmt} width={60} domain={["auto", "auto"]} style={axisStyle} />
          <Tooltip formatter={(v: unknown) => Array.isArray(v) ? v.map((n) => fmtFull(Number(n))).join(" ~ ") : fmtFull(Number(v))} />
          <Legend wrapperStyle={legendStyle} />

          <Area type="monotone" dataKey="range90" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} strokeOpacity={0} name="상위 10%~90%" isAnimationActive={false} />
          <Area type="monotone" dataKey="range50" stroke="#8884d8" fill="#8884d8" fillOpacity={0.4} strokeOpacity={0} name="상위 25%~75%" isAnimationActive={false} />
          <Line type="monotone" dataKey="p50" stroke="#333" dot={false} strokeWidth={2} name="중위값 (50%)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
