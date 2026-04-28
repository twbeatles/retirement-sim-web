import React from 'react';
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
} from 'recharts';
import { getSampleDisplayPaths } from '../../logic/resultDisplay';
import type { SimulationResult } from '../../logic/types';

export const SurvivalChart = React.memo(function SurvivalChart({ result }: { result: SimulationResult }) {
    const survivalData = React.useMemo(() => {
        if (result.mode === "deterministic") {
            return [];
        }

        if (result.survivalSeries && result.survivalSeries.month.length > 0) {
            const step = result.survivalSeries.month.length > 200 ? 12 : 6;
            const data = [] as Array<{ month: number; age: number; survivalRate: number }>;

            for (let i = 0; i < result.survivalSeries.month.length; i += step) {
                data.push({
                    month: result.survivalSeries.month[i],
                    age: result.survivalSeries.age[i],
                    survivalRate: result.survivalSeries.survivalRate[i]
                });
            }

            return data;
        }

        const samplePaths = getSampleDisplayPaths(result);
        if (samplePaths.length === 0) {
            return [];
        }

        // Fallback for legacy payloads
        const timelines = samplePaths.map((sample) => sample.timeline);
        const totalPaths = timelines.length;
        const months = timelines[0].length;
        const data = [] as Array<{ month: number; age: number; survivalRate: number }>;

        for (let month = 0; month < months; month += 12) {
            let aliveCount = 0;
            for (let path = 0; path < totalPaths; path++) {
                if (timelines[path][month].totalAssets > 0) {
                    aliveCount++;
                }
            }

            data.push({
                month: timelines[0][month].month,
                age: Math.floor(timelines[0][month].age),
                survivalRate: (aliveCount / totalPaths) * 100
            });
        }

        return data;
    }, [result]);

    if (result.mode === 'deterministic') {
        return <div>분포 기반 결과가 있어야 생존 확률을 계산할 수 있습니다.</div>;
    }

    if (survivalData.length === 0) {
        return <div>표시할 자산 생존 데이터가 없습니다.</div>;
    }

    return (
        <div className="chart-box chart-box-md">
            <ResponsiveContainer>
                <LineChart data={survivalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" tickFormatter={(age) => `${age}세`} />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip
                        formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                        labelFormatter={(label) => `${label}세 시점`}
                    />
                    <Legend />
                    <ReferenceLine y={90} stroke="red" strokeDasharray="3 3" label="90%" />
                    <Line
                        type="stepAfter"
                        dataKey="survivalRate"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={false}
                        name="자산 생존 확률"
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
            <div className="text-center text-xs text-sub mt-2">
                * 해당 나이까지 자산이 남아있을 확률입니다.
            </div>
        </div>
    );
});

