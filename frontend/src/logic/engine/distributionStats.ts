import { meanTyped, percentileSorted } from "../math";
import type { SimulationInput } from "../types";
import { buildSurvivalStatsFromDepletionMonths } from "./summary";

export function summarizeDistributionPaths(
    input: SimulationInput,
    totalMonths: number,
    pathCount: number,
    finalAssets: Float64Array,
    finalAssetsReal: Float64Array,
    retirementAssets: Float64Array,
    retirementAssetsReal: Float64Array,
    firstDepletionMonthByPath: Int32Array,
    firstDepletionAgeByPath: Float64Array
) {
    const sortedNom = Float64Array.from(finalAssets);
    sortedNom.sort();
    const sortedReal = Float64Array.from(finalAssetsReal);
    sortedReal.sort();
    const sortedRetNom = Float64Array.from(retirementAssets);
    sortedRetNom.sort();
    const sortedRetReal = Float64Array.from(retirementAssetsReal);
    sortedRetReal.sort();

    const meanNom = meanTyped(finalAssets);
    const meanReal = meanTyped(finalAssetsReal);
    const neverDepletedCount = Array.from(firstDepletionMonthByPath).filter((month) => month < 0).length;
    const depletedAges = Array.from(firstDepletionAgeByPath).filter((age) => age >= 0).sort((a, b) => a - b);

    const totalAssetsStats = {
        p10: percentileSorted(sortedNom, 10),
        p50: percentileSorted(sortedNom, 50),
        p90: percentileSorted(sortedNom, 90),
        mean: meanNom
    };
    const totalAssetsRealStats = {
        p10: percentileSorted(sortedReal, 10),
        p50: percentileSorted(sortedReal, 50),
        p90: percentileSorted(sortedReal, 90),
        mean: meanReal
    };
    const depletionStats = {
        firstDepletionMonthByPath: Array.from(firstDepletionMonthByPath),
        firstDepletionAgeByPath: Array.from(firstDepletionAgeByPath),
        neverDepletedRate: neverDepletedCount / pathCount,
        medianDepletionAge: depletedAges.length > 0 ? percentileSorted(depletedAges, 50) : null
    };
    const survivalStats = buildSurvivalStatsFromDepletionMonths(
        totalMonths,
        input.current_age,
        firstDepletionMonthByPath,
        pathCount
    );

    return {
        sortedRetNom,
        sortedRetReal,
        meanNom,
        meanReal,
        totalAssetsStats,
        totalAssetsRealStats,
        depletionStats,
        survivalStats
    };
}
