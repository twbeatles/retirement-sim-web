import type { SimulationResult } from "../../logic/types";

export const COMPARISON_COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00C49F", "#FFBB28"];

export type ComparisonData = {
    id: string;
    name: string;
    color: string;
    result: SimulationResult;
    trajectory: { month: number; value: number }[];
};

export type ChartPoint = {
    month: number;
    [seriesId: string]: number | undefined;
};
