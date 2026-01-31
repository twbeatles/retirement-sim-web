import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  ComposedChart
} from "recharts";
import type { TimelineRow, SimulationTrajectoryStats } from "../logic/types";

function fmt(n: number) {
  if (!isFinite(n)) return "-";
  return Math.round(n / 10000).toLocaleString() + "만"; // Unit: 10k KRW for simpler view
}

function fmtFull(n: number) {
  if (!isFinite(n)) return "-";
  return Math.round(n).toLocaleString();
}

// Helper to check mobile - simpler than hook overhead for every chart?
// Actually Recharts responsive container handles size.
// We just need to hide Y-axis ticks on very small screens or reduce font size.
// Using a simple style prop check or CSS.

const axisStyle = { fontSize: '0.75rem' };

export const AssetChart = React.memo(function AssetChart({ data }: { data: TimelineRow[] }) {
  const samplingRate = data.length > 200 ? 6 : 1;
  const sampled = data.filter((_, i) => i % samplingRate === 0);

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={sampled} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tickFormatter={(m) => `${Math.floor(m / 12)}y`} style={axisStyle} />
          <YAxis tickFormatter={fmt} width={60} style={axisStyle} />
          <Tooltip formatter={(v: any) => fmtFull(Number(v))} labelFormatter={(l) => Math.floor(Number(l) / 12) + "년차"} />
          <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
          <Line type="monotone" dataKey="totalAssets" dot={false} stroke="#8884d8" name="총자산(명목)" />
          <Line type="monotone" dataKey="totalAssetsReal" dot={false} stroke="#82ca9d" name="총자산(실질)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export const RetirementCashflowChart = React.memo(function RetirementCashflowChart({ data }: { data: TimelineRow[] }) {
  const retired = data.filter((r) => r.isRetired);
  const samplingRate = retired.length > 200 ? 6 : 1;
  const sampled = retired.filter((_, i) => i % samplingRate === 0);

  const stack = sampled.map((r) => ({
    month: r.month,
    year: Math.floor(r.month / 12),
    national: r.cashflow.nationalPension,
    private: r.cashflow.privatePension,
    withdrawalNet: r.cashflow.withdrawalNet,
    tax: r.cashflow.taxPaid
  }));

  return (
    <div style={{ width: "100%", height: 320 }}>
      {stack.length === 0 ? <div style={{ textAlign: "center", padding: 50 }}>은퇴 구간 데이터가 없습니다.</div> : (
        <ResponsiveContainer>
          <AreaChart data={stack} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tickFormatter={(y) => y + "세"} style={axisStyle} />
            <YAxis tickFormatter={fmt} width={60} style={axisStyle} />
            <Tooltip formatter={(v: any) => fmtFull(Number(v))} />
            <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
            <Area type="monotone" dataKey="national" stackId="1" stroke="#ffc658" fill="#ffc658" name="국민연금" />
            <Area type="monotone" dataKey="private" stackId="1" stroke="#8884d8" fill="#8884d8" name="개인연금" />
            <Area type="monotone" dataKey="withdrawalNet" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="자산인출(세후)" />
            <Area type="monotone" dataKey="tax" stackId="1" stroke="#ff8042" fill="#ff8042" name="세금" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});

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
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tickFormatter={(m) => `${Math.floor(m / 12)}y`} style={axisStyle} />
          <YAxis tickFormatter={fmt} width={60} domain={['auto', 'auto']} style={axisStyle} />
          <Tooltip formatter={(v: any) => Array.isArray(v) ? v.map(n => fmtFull(n)).join(" ~ ") : fmtFull(Number(v))} />
          <Legend wrapperStyle={{ fontSize: '0.8rem' }} />

          <Area type="monotone" dataKey="range90" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} strokeOpacity={0} name="상위 10%~90%" />
          <Area type="monotone" dataKey="range50" stroke="#8884d8" fill="#8884d8" fillOpacity={0.4} strokeOpacity={0} name="상위 25%~75%" />
          <Line type="monotone" dataKey="p50" stroke="#333" dot={false} strokeWidth={2} name="중위값 (50%)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

// Re-export new charts
export { AssetBreakdownChart } from "./Charts/AssetBreakdownChart";
export { CashflowStackChart } from "./Charts/CashflowStackChart";
export { SurvivalChart } from "./Charts/SurvivalChart";
