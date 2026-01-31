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
    ReferenceLine
} from "recharts";
import type { SimulationResult } from "../../logic/types";

export const SurvivalChart = React.memo(function SurvivalChart({ result }: { result: SimulationResult }) {
    if (result.mode === "deterministic" || !result.sampleTimelines.length) {
        return <div>몬테카를로 시뮬레이션 결과가 필요합니다.</div>;
    }

    // Calculate Survival Probability over time
    // Iterating all paths is expensive in UI thread if paths > 1000.
    // Ideally this should be computed in engine/worker and passed as 'stats'.
    // But for Phase 3, let's compute it here or assume engine provides it.
    // Engine provides 'trajectoryStats': p10, p25, p50... but not 'survivalRate' per month.

    // Let's implement client-side calculation (memoized) for now.
    // If performance issue, move to engine.

    const survivalData = React.useMemo(() => {
        const timelines = result.sampleTimelines;
        const totalPaths = timelines.length;
        if (totalPaths === 0) return [];

        const months = timelines[0].length;
        const data = [];

        // Sampling rate to reduce points
        const step = 12; // Yearly points

        for (let m = 0; m < months; m += step) {
            let aliveCount = 0;
            for (let p = 0; p < totalPaths; p++) {
                if (timelines[p][m].totalAssets > 0) {
                    aliveCount++;
                }
            }

            data.push({
                month: timelines[0][m].month,
                age: Math.floor(timelines[0][m].age),
                survivalRate: (aliveCount / totalPaths) * 100
            });
        }

        return data;
    }, [result]);

    return (
        <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
                <LineChart data={survivalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" tickFormatter={(a) => `${a}세`} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} labelFormatter={(l) => `${l}세 시점`} />
                    <Legend />
                    <ReferenceLine y={90} stroke="red" strokeDasharray="3 3" label="90% 안전선" />
                    <Line
                        type="stepAfter"
                        dataKey="survivalRate"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={false}
                        name="자산 생존 확률"
                    />
                </LineChart>
            </ResponsiveContainer>
            <div className="text-center text-xs text-sub mt-2">
                * 해당 연령까지 자산이 고갈되지 않고 남아있을 확률입니다.
            </div>
        </div>
    );
});
