import { getRepresentativeTimeline } from "../../logic/resultDisplay";
import type { SimulationResult } from "../../logic/types";
import type { ChartPoint, ComparisonData } from "./types";

export function getTrajectoryP50(result: SimulationResult): { month: number; value: number }[] {
    if (result.mode !== "deterministic" && result.trajectoryStats) {
        return result.trajectoryStats.month.map((month, index) => ({
            month,
            value: result.trajectoryStats!.p50[index]
        }));
    }

    const representativeTimeline = getRepresentativeTimeline(result);
    if (representativeTimeline.length > 0) {
        return representativeTimeline.map((row) => ({
            month: row.month,
            value: row.totalAssetsReal
        }));
    }

    return [];
}

export function buildComparisonChartData(comparisonData: ComparisonData[]): ChartPoint[] {
    if (comparisonData.length === 0) return [];

    const pointByMonth = new Map<number, ChartPoint>();

    for (const item of comparisonData) {
        for (const row of item.trajectory) {
            if (row.month % 12 !== 0) {
                continue;
            }
            const existing = pointByMonth.get(row.month) ?? { month: row.month };
            existing[item.id] = row.value;
            pointByMonth.set(row.month, existing);
        }
    }

    return Array.from(pointByMonth.values()).sort((a, b) => a.month - b.month);
}
