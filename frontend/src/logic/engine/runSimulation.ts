import {
    type SimulationInput,
    type SimulationResult,
    type SimulationRunOptions,
    type SimulationSummary,
    type TimelineRow,
} from "../types";
import { getAvailableHistoricalScenarioCount } from "../historicalData";
import { percentileSorted, randomNormal, setSeed } from "../math";
import {
    createDistributionStatsFromValue,
    createRuleMetadata,
} from "../rules/kr";
import type { SimulationPlanV3 } from "../plan";
import { buildSimulationContext } from "./context";
import {
    buildSummaryBase,
    buildSurvivalSeriesFromDepletionMonths,
} from "./summary";
import { simulateOnePath } from "./pathSimulation";
import {
    selectRepresentativePathIndex,
    selectSamplePathIndices,
    type DistributionPathSnapshot,
} from "./pathSelection";
import { replayHistoricalPath, replayMonteCarloPath } from "./pathReplay";
import { assertSimulationInputCanRun } from "./modePolicy";
import { resolveSimulationRunConfig } from "./runConfig";
import { summarizeDistributionPaths } from "./distributionStats";

export function runSimulation(
    input: SimulationInput,
    options?: SimulationRunOptions,
    runtimePlan?: SimulationPlanV3
): SimulationResult {
    assertSimulationInputCanRun(input);
    const {
        detailLevel,
        isPreview,
        includeSampleTimelines,
        includeTrajectoryStats,
        includeSurvivalSeries,
        maxSampleTimelines,
        previewPathCap
    } = resolveSimulationRunConfig(options);

    // Initialize seed for reproducible simulations
    setSeed(input.simulation_settings.seed);

    const ctx = buildSimulationContext(input, runtimePlan);
    const totalMonths = ctx.totalMonths;
    const isHistorical = input.simulation_settings.mode === "historical";
    const stochastic = input.simulation_settings.mode === "montecarlo";

    // Phase 7: Historical Mode - Rolling window backtesting
    if (isHistorical) {
        // Run multiple rolling window scenarios
        const numScenarios = getAvailableHistoricalScenarioCount(
            input.simulation_settings.historical_start_year ?? createRuleMetadata(input.rule_set).historicalDataRange.startYear
        );
        const MAX_SAMPLE_PATHS = includeSampleTimelines ? Math.min(maxSampleTimelines, numScenarios) : 0;
        const sampleTimelines: TimelineRow[][] = [];
        const finalAssets = new Float64Array(numScenarios);
        const finalAssetsReal = new Float64Array(numScenarios);
        const retirementAssets = new Float64Array(numScenarios);
        const retirementAssetsReal = new Float64Array(numScenarios);
        const firstDepletionMonthByPath = new Int32Array(numScenarios).fill(-1);
        const firstDepletionAgeByPath = new Float64Array(numScenarios).fill(-1);

        for (let p = 0; p < numScenarios; p++) {
            const shouldCaptureTimeline = MAX_SAMPLE_PATHS > 0 && p < MAX_SAMPLE_PATHS;
            const simulation = simulateOnePath(input, ctx, false, p, { captureTimeline: shouldCaptureTimeline });
            finalAssets[p] = simulation.finalTotalAssets;
            finalAssetsReal[p] = simulation.finalTotalAssetsReal;
            retirementAssets[p] = simulation.retirementTotalAssets;
            retirementAssetsReal[p] = simulation.retirementTotalAssetsReal;
            firstDepletionMonthByPath[p] = simulation.firstDepletionMonth;
            firstDepletionAgeByPath[p] = simulation.firstDepletionMonth >= 0
                ? (input.current_age + (simulation.firstDepletionMonth / 12))
                : -1;

            if (shouldCaptureTimeline) {
                sampleTimelines.push(simulation.timeline);
            }
        }

        // Calculate success rate and stats
        let successes = 0;
        for (let i = 0; i < numScenarios; i++) {
            if (finalAssets[i] > 0) successes++;
        }

        const {
            sortedRetNom,
            sortedRetReal,
            meanNom,
            meanReal,
            totalAssetsStats,
            totalAssetsRealStats,
            depletionStats,
            survivalStats
        } = summarizeDistributionPaths(
            input,
            totalMonths,
            numScenarios,
            finalAssets,
            finalAssetsReal,
            retirementAssets,
            retirementAssetsReal,
            firstDepletionMonthByPath,
            firstDepletionAgeByPath
        );
        const survivalSeries = includeSurvivalSeries
            ? buildSurvivalSeriesFromDepletionMonths(
                totalMonths,
                input.current_age,
                firstDepletionMonthByPath,
                numScenarios
            )
            : undefined;
        const summary: SimulationSummary = {
            ...buildSummaryBase(
                input,
                "historical",
                "distribution",
                meanNom,
                meanReal,
                percentileSorted(sortedRetNom, 50),
                percentileSorted(sortedRetReal, 50),
                successes / numScenarios,
                {
                    totalAssets: totalAssetsStats,
                    totalAssetsReal: totalAssetsRealStats
                },
                depletionStats,
                survivalStats
            ),
            mc: {
                totalAssetsReal: totalAssetsRealStats,
                totalAssets: totalAssetsStats
            }
        };
        const pathSnapshots: DistributionPathSnapshot[] = Array.from({ length: numScenarios }, (_, index) => ({
            index,
            finalTotalAssetsReal: finalAssetsReal[index],
            retirementTotalAssetsReal: retirementAssetsReal[index],
            depletionAge: firstDepletionAgeByPath[index]
        }));
        const representativeIndex = isPreview
            ? -1
            : selectRepresentativePathIndex(
                pathSnapshots,
                totalAssetsRealStats.p50,
                percentileSorted(sortedRetReal, 50),
                depletionStats.medianDepletionAge
            );
        const representativeTimeline = representativeIndex >= 0
            ? replayHistoricalPath(input, ctx, representativeIndex)
            : undefined;
        const samplePathDefs = !isPreview && includeSampleTimelines && maxSampleTimelines > 0
            ? selectSamplePathIndices(pathSnapshots, totalAssetsRealStats, representativeIndex).slice(0, maxSampleTimelines)
            : [];
        const display = {
            representative: representativeTimeline
                ? {
                    label: "대표 경로",
                    pathIndex: representativeIndex,
                    timeline: representativeTimeline
                }
                : undefined,
            samples: samplePathDefs
                .map((sample) => ({
                    label: sample.label,
                    pathIndex: sample.index,
                    timeline: replayHistoricalPath(input, ctx, sample.index)
                }))
        };

        return {
            mode: "historical",
            detailLevel,
            pathCount: numScenarios,
            sampleTimelines,
            display,
            summary,
            survivalSeries
        };
    }

    if (!stochastic) {
        // Deterministic Run
        const deterministic = simulateOnePath(input, ctx, false, undefined, { captureTimeline: true });
        const terminalStats = {
            totalAssets: createDistributionStatsFromValue(deterministic.finalTotalAssets),
            totalAssetsReal: createDistributionStatsFromValue(deterministic.finalTotalAssetsReal)
        };
        const depletionStats = {
            firstDepletionMonthByPath: [deterministic.firstDepletionMonth],
            firstDepletionAgeByPath: [deterministic.firstDepletionMonth >= 0 ? input.current_age + (deterministic.firstDepletionMonth / 12) : -1],
            neverDepletedRate: deterministic.finalTotalAssets > 0 ? 1 : 0,
            medianDepletionAge: deterministic.firstDepletionMonth >= 0 ? input.current_age + (deterministic.firstDepletionMonth / 12) : null
        };
        const summary: SimulationSummary = {
            ...buildSummaryBase(
                input,
                "deterministic",
                "deterministic",
                deterministic.finalTotalAssets,
                deterministic.finalTotalAssetsReal,
                deterministic.retirementTotalAssets,
                deterministic.retirementTotalAssetsReal,
                deterministic.finalTotalAssets > 0 ? 1.0 : 0.0,
                terminalStats,
                depletionStats,
                {
                    finalSurvivalRate: deterministic.finalTotalAssets > 0 ? 100 : 0,
                    lowestSurvivalRate: deterministic.finalTotalAssets > 0 ? 100 : 0,
                    firstBelowHundredPercentAge: deterministic.firstDepletionMonth >= 0 ? input.current_age + (deterministic.firstDepletionMonth / 12) : null
                }
            ),
            mc: {
                totalAssets: terminalStats.totalAssets,
                totalAssetsReal: terminalStats.totalAssetsReal
            }
        };

        return {
            mode: "deterministic",
            detailLevel,
            timeline: deterministic.timeline,
            display: {
                representative: {
                    label: "대표 경로",
                    pathIndex: null,
                    timeline: deterministic.timeline
                },
                samples: []
            },
            summary
        };
    } else {
        // Monte Carlo Run
        const rawPaths = Number.isFinite(input.simulation_settings.mc_paths)
            ? input.simulation_settings.mc_paths
            : 100;
        const configuredPaths = Math.max(1, Math.floor(rawPaths || 100));
        const paths = isPreview ? Math.min(configuredPaths, previewPathCap) : configuredPaths;

        // Memory Optimization: Store only sample timelines
        const MAX_SAMPLE_PATHS = includeSampleTimelines ? Math.min(maxSampleTimelines, paths) : 0;
        const sampleTimelines: TimelineRow[][] = [];
        // Store only final values for stats
        const finalAssets = new Float64Array(paths);
        const finalAssetsReal = new Float64Array(paths);
        const retirementAssets = new Float64Array(paths);
        const retirementAssetsReal = new Float64Array(paths);
        const firstDepletionMonthByPath = new Int32Array(paths).fill(-1);
        const firstDepletionAgeByPath = new Float64Array(paths).fill(-1);

        // Fan Chart Accumulation: Store all "Total Assets Real" for all paths/months
        // Index = path * totalMonths + month
        // To be safer for memory with high path counts, we could only store percentiles on the fly.
        // But 1000 paths * 720 months = 720k doubles = ~5.7MB. Totally fine.
        const allTraj = !isPreview && (includeTrajectoryStats || includeSurvivalSeries)
            ? new Float64Array(paths * totalMonths)
            : null;

        let successCount = 0;

        for (let i = 0; i < paths; i++) {
            // Longevity Risk: Randomize end age per path if enabled
            let pathEndAge = input.end_age;
            if (input.longevity_risk?.useDistribution) {
                const meanAge = input.longevity_risk.averageLifeExpectancy || 83.5;
                const stdDev = input.longevity_risk.stdDevYears || 5;
                pathEndAge = Math.round(meanAge + stdDev * randomNormal());
                // Clamp to reasonable bounds
                pathEndAge = Math.max(input.retire_age + 1, Math.min(pathEndAge, 120));
            }

            // Create modified context with adjusted totalMonths for this path
            const pathTotalMonths = (pathEndAge - input.current_age) * 12;
            const pathCtx = { ...ctx, totalMonths: pathTotalMonths };
            const shouldCaptureTimeline = MAX_SAMPLE_PATHS > 0 && i < MAX_SAMPLE_PATHS;
            const simulation = simulateOnePath(input, pathCtx, true, undefined, {
                captureTimeline: shouldCaptureTimeline,
                trajectorySink: allTraj,
                trajectoryPathIndex: i,
                trajectoryLength: totalMonths
            });

            if (shouldCaptureTimeline) {
                sampleTimelines.push(simulation.timeline);
            }

            finalAssets[i] = simulation.finalTotalAssets;
            finalAssetsReal[i] = simulation.finalTotalAssetsReal;
            retirementAssets[i] = simulation.retirementTotalAssets;
            retirementAssetsReal[i] = simulation.retirementTotalAssetsReal;
            firstDepletionMonthByPath[i] = simulation.firstDepletionMonth;
            firstDepletionAgeByPath[i] = simulation.firstDepletionMonth >= 0
                ? (input.current_age + (simulation.firstDepletionMonth / 12))
                : -1;

            if (simulation.finalTotalAssets > 0) successCount++;
        }

        // Calculate Trajectory Stats (for Fan Chart)
        const trajStats = includeTrajectoryStats ? {
            month: [] as number[],
            p10: [] as number[],
            p25: [] as number[],
            p50: [] as number[],
            p75: [] as number[],
            p90: [] as number[]
        } : undefined;
        const survivalSeries = includeSurvivalSeries ? {
            month: [] as number[],
            age: [] as number[],
            survivalRate: [] as number[]
        } : undefined;
        if (allTraj) {
            const needsTrajectoryStats = Boolean(trajStats);
            const needsSurvivalSeries = Boolean(survivalSeries);
            const column = needsTrajectoryStats ? new Float64Array(paths) : null;

            for (let m = 0; m < totalMonths; m++) {
                let aliveCount = 0;

                if (needsTrajectoryStats) {
                    for (let p = 0; p < paths; p++) {
                        const value = allTraj[p * totalMonths + m];
                        column![p] = value;
                        if (needsSurvivalSeries && value > 0) {
                            aliveCount++;
                        }
                    }
                    column!.sort((a, b) => a - b);

                    trajStats!.month.push(m);
                    trajStats!.p10.push(percentileSorted(column!, 10));
                    trajStats!.p25.push(percentileSorted(column!, 25));
                    trajStats!.p50.push(percentileSorted(column!, 50));
                    trajStats!.p75.push(percentileSorted(column!, 75));
                    trajStats!.p90.push(percentileSorted(column!, 90));
                } else if (needsSurvivalSeries) {
                    for (let p = 0; p < paths; p++) {
                        const value = allTraj[p * totalMonths + m];
                        if (value > 0) {
                            aliveCount++;
                        }
                    }
                }

                if (needsSurvivalSeries) {
                    survivalSeries!.month.push(m);
                    survivalSeries!.age.push(Math.floor(input.current_age + m / 12));
                    survivalSeries!.survivalRate.push((aliveCount / paths) * 100);
                }
            }
        }
        const {
            sortedRetNom,
            sortedRetReal,
            meanNom,
            meanReal,
            totalAssetsStats,
            totalAssetsRealStats,
            depletionStats,
            survivalStats
        } = summarizeDistributionPaths(
            input,
            totalMonths,
            paths,
            finalAssets,
            finalAssetsReal,
            retirementAssets,
            retirementAssetsReal,
            firstDepletionMonthByPath,
            firstDepletionAgeByPath
        );
        const summary: SimulationSummary = {
            ...buildSummaryBase(
                input,
                "montecarlo",
                "distribution",
                meanNom,
                meanReal,
                percentileSorted(sortedRetNom, 50),
                percentileSorted(sortedRetReal, 50),
                successCount / paths,
                {
                    totalAssets: totalAssetsStats,
                    totalAssetsReal: totalAssetsRealStats
                },
                depletionStats,
                survivalStats
            ),
            mc: {
                totalAssets: totalAssetsStats,
                totalAssetsReal: totalAssetsRealStats
            }
        };
        const pathSnapshots: DistributionPathSnapshot[] = Array.from({ length: paths }, (_, index) => ({
            index,
            finalTotalAssetsReal: finalAssetsReal[index],
            retirementTotalAssetsReal: retirementAssetsReal[index],
            depletionAge: firstDepletionAgeByPath[index]
        }));
        const representativeIndex = isPreview
            ? -1
            : selectRepresentativePathIndex(
                pathSnapshots,
                totalAssetsRealStats.p50,
                percentileSorted(sortedRetReal, 50),
                depletionStats.medianDepletionAge
            );
        const representativeTimeline = representativeIndex >= 0
            ? replayMonteCarloPath(input, ctx, representativeIndex)
            : undefined;
        const samplePathDefs = !isPreview && includeSampleTimelines && maxSampleTimelines > 0
            ? selectSamplePathIndices(pathSnapshots, totalAssetsRealStats, representativeIndex).slice(0, maxSampleTimelines)
            : [];
        const display = {
            representative: representativeTimeline
                ? {
                    label: "대표 경로",
                    pathIndex: representativeIndex,
                    timeline: representativeTimeline
                }
                : undefined,
            samples: samplePathDefs.map((sample) => ({
                label: sample.label,
                pathIndex: sample.index,
                timeline: replayMonteCarloPath(input, ctx, sample.index)
            }))
        };

        return {
            mode: "montecarlo",
            detailLevel,
            pathCount: paths,
            sampleTimelines,
            display,
            summary,
            trajectoryStats: allTraj && trajStats ? trajStats : undefined,
            survivalSeries: allTraj && survivalSeries ? survivalSeries : undefined
        };
    }
}
