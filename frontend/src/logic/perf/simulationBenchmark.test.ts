/**
 * Phase 0 — Simulation performance baseline harness + golden parity gate.
 *
 * - Parity assertions ALWAYS run (fast, small path counts). They pin the
 *   pre-optimization engine outputs so Phase 1-4 cannot silently change
 *   financial semantics.
 * - Wall-clock measurements print ONLY when `PERF_BENCH=1` is set, so the
 *   default `npm run test` stays quiet and fast.
 * - Heavy matrix cases (1k-10k paths, longevity, historical) run ONLY when
 *   `PERF_FULL=1` is set.
 * - The golden fixture is (re)generated ONLY when `GENERATE_GOLDEN=1` is set:
 *   `GENERATE_GOLDEN=1 npx vitest run src/logic/perf/simulationBenchmark.test.ts`.
 *   Never generate and assert in the same run.
 */
import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runSimulation } from "../engine";
import { buildSimulationContext } from "../engine/context";
import { replayMonteCarloPath } from "../engine/pathReplay";
import {
    buildSurvivalSeriesFromDepletionMonths,
    buildSurvivalStatsFromDepletionMonths
} from "../engine/summary";
import {
    percentileSorted,
    randomNormal,
    randomNormalArray,
    restoreRngState,
    setSeed,
    snapshotRngState
} from "../math";
import { simulateMonteCarloPathOnce } from "../engine/pathReplay";
import type {
    SimulationInput,
    SimulationResult,
    SimulationRunOptions,
    TimelineRow
} from "../types";
import goldenRaw from "./__fixtures__/simulation-golden.json";

const BENCH = process.env.PERF_BENCH === "1";
const FULL = process.env.PERF_FULL === "1";
const GENERATE = process.env.GENERATE_GOLDEN === "1";

type GoldenCaseRecord = {
    inputHash: string;
    seed: number | null;
    mode: string;
    pathCount: number | null;
    summary: unknown;
    trajectoryStats: unknown;
    survivalSeries: unknown;
    timelineDigest: string | null;
    sampleTimelineDigests: string[];
    display: {
        representativePathIndex: number | null | undefined;
        representativeDigest: string | null;
        samplePathIndices: (number | null)[];
        sampleDigests: string[];
    };
    keyRows: Record<string, unknown>;
};

type GoldenFile = {
    note: string;
    cases: Record<string, GoldenCaseRecord>;
};

const GOLDEN = goldenRaw as GoldenFile;

// ---------------------------------------------------------------- helpers

function fnv1aHex(value: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}

function digest(value: unknown): string {
    return fnv1aHex(JSON.stringify(value));
}

function inputHashOf(input: SimulationInput): string {
    return digest(input);
}

function keyRowsOf(timeline: TimelineRow[]): Record<string, unknown> {
    if (timeline.length === 0) return { length: 0 };
    const pick = (row: TimelineRow) => ({
        month: row.month,
        totalAssets: row.totalAssets,
        totalAssetsReal: row.totalAssetsReal,
        general: row.general,
        privatePension: row.privatePension,
        debt: row.debt
    });
    return {
        length: timeline.length,
        first: pick(timeline[0]),
        middle: pick(timeline[Math.floor(timeline.length / 2)]),
        last: pick(timeline[timeline.length - 1])
    };
}

function statsOf(samples: number[]): { median: number; p95: number; min: number; max: number } {
    const sorted = [...samples].sort((a, b) => a - b);
    const at = (p: number): number => {
        const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
        return sorted[index];
    };
    return { median: at(50), p95: at(95), min: sorted[0], max: sorted[sorted.length - 1] };
}

function measure(label: string, warmup: number, repeat: number, fn: () => void): void {
    for (let i = 0; i < warmup; i++) fn();
    const samples: number[] = [];
    const heapBefore = process.memoryUsage().heapUsed;
    for (let i = 0; i < repeat; i++) {
        const start = performance.now();
        fn();
        samples.push(performance.now() - start);
    }
    const heapAfter = process.memoryUsage().heapUsed;
    const s = statsOf(samples);
    const heapMB = (heapAfter - heapBefore) / 1024 / 1024;
    console.log(
        `${label} | median=${s.median.toFixed(1)}ms p95=${s.p95.toFixed(1)}ms ` +
        `min=${s.min.toFixed(1)}ms max=${s.max.toFixed(1)}ms heapΔ=${heapMB.toFixed(1)}MB`
    );
}

// ---------------------------------------------------------------- inputs

function baseKernelInput(): SimulationInput {
    return {
        current_age: 45,
        retire_age: 60,
        end_age: 90,
        annual_inflation: 0.02,
        portfolio: {
            assetClasses: [
                { id: "stock", name: "Stock", allocation: 0.7, expectedAnnualReturn: 0.07, annualVolatility: 0.18 },
                { id: "bond", name: "Bond", allocation: 0.3, expectedAnnualReturn: 0.03, annualVolatility: 0.06 }
            ],
            manualCorrelation: 0.2
        },
        general: { current_balance: 400000000, monthly_contribution: 1500000 },
        private_pension: {
            current_balance: 60000000,
            monthly_contribution: 300000,
            annual_return: 0.035,
            payout_years: 25,
            annuity_annual_rate: 0.03
        },
        national_pension: { expected_monthly_benefit_at_retirement: 1800000, inflation_linked: true },
        debt: { current_balance: 120000000, annual_interest: 0.04, monthly_payment: 900000 },
        withdrawal: { strategy: "target_spending", targetMonthlySpending: 4500000, taxRate: 0.12, taxStrategy: "simple" },
        events: [
            { month_index: 24, amount: -10000000, name: "car" },
            { month_index: 144, amount: 30000000, name: "inheritance" }
        ],
        simulation_settings: { mode: "montecarlo", mc_paths: 32, seed: 20260222 }
    };
}

function deterministicInput(): SimulationInput {
    return {
        current_age: 60,
        retire_age: 65,
        end_age: 70,
        annual_inflation: 0.0,
        portfolio: {
            assetClasses: [
                { id: "stock", name: "Stock", allocation: 1.0, expectedAnnualReturn: 0.1, annualVolatility: 0.0 }
            ],
            manualCorrelation: 1.0
        },
        general: { current_balance: 10000, monthly_contribution: 0 },
        private_pension: {
            current_balance: 0,
            monthly_contribution: 0,
            annual_return: 0,
            payout_years: 0,
            annuity_annual_rate: 0
        },
        national_pension: { expected_monthly_benefit_at_retirement: 0, inflation_linked: false },
        debt: { current_balance: 0, annual_interest: 0, monthly_payment: 0 },
        withdrawal: { strategy: "fixed_amount", fixedMonthlyAmount: 0, taxRate: 0, taxStrategy: "simple" },
        events: [],
        simulation_settings: { mode: "deterministic", mc_paths: 1 }
    };
}

function mcInput(paths: number, seed: number, options?: Partial<SimulationInput>): SimulationInput {
    const base = baseKernelInput();
    base.simulation_settings = { mode: "montecarlo", mc_paths: paths, seed };
    return { ...base, ...options };
}

const GOLDEN_CASES: Array<{ id: string; input: () => SimulationInput; options?: SimulationRunOptions }> = [
    { id: "G-1-deterministic", input: deterministicInput, options: { detailLevel: "full" } },
    { id: "G-2-mc32-seed20260222", input: () => mcInput(32, 20260222), options: { detailLevel: "full" } },
    { id: "G-3-mc32-seed0", input: () => mcInput(32, 0), options: { detailLevel: "full" } },
    {
        id: "G-4-preview80",
        input: () => mcInput(200, 7),
        options: { detailLevel: "preview", previewPathCap: 80 }
    },
    {
        id: "G-5-mc32-no-samples",
        input: () => mcInput(32, 99),
        options: { detailLevel: "full", includeSampleTimelines: false, maxSampleTimelines: 0 }
    }
];

function recordGolden(
    caseId: string,
    input: SimulationInput,
    options: SimulationRunOptions | undefined,
    result: SimulationResult
): GoldenCaseRecord {
    const representative = result.display.representative;
    return {
        inputHash: inputHashOf(input),
        seed: input.simulation_settings.seed ?? null,
        mode: result.mode,
        pathCount: "pathCount" in result ? result.pathCount : null,
        summary: result.summary,
        trajectoryStats: "trajectoryStats" in result ? (result.trajectoryStats ?? null) : null,
        survivalSeries: "survivalSeries" in result ? (result.survivalSeries ?? null) : null,
        timelineDigest: result.mode === "deterministic" ? digest(result.timeline) : null,
        sampleTimelineDigests: result.mode === "deterministic" ? [] : result.sampleTimelines.map(digest),
        display: {
            representativePathIndex: representative ? representative.pathIndex : null,
            representativeDigest: representative ? digest(representative.timeline) : null,
            samplePathIndices: result.display.samples.map((s) => s.pathIndex),
            sampleDigests: result.display.samples.map((s) => digest(s.timeline))
        },
        keyRows: {
            options: options ?? null,
            timeline: result.mode === "deterministic" ? keyRowsOf(result.timeline) : null,
            representative: representative ? keyRowsOf(representative.timeline) : null,
            firstSample: result.display.samples.length > 0 ? keyRowsOf(result.display.samples[0].timeline) : null
        }
    };
}

function assertGoldenParity(
    caseId: string,
    input: SimulationInput,
    options: SimulationRunOptions | undefined,
    result: SimulationResult
): void {
    const expected = GOLDEN.cases[caseId];
    expect(expected, `golden record for ${caseId} must exist (run with GENERATE_GOLDEN=1)`).toBeDefined();
    const actual = recordGolden(caseId, input, options, result);
    expect(actual.inputHash).toBe(expected.inputHash);
    expect(actual.seed).toBe(expected.seed);
    expect(actual.mode).toBe(expected.mode);
    expect(actual.pathCount).toBe(expected.pathCount);
    expect(actual.summary).toEqual(expected.summary);
    expect(actual.trajectoryStats).toEqual(expected.trajectoryStats);
    expect(actual.survivalSeries).toEqual(expected.survivalSeries);
    expect(actual.timelineDigest).toBe(expected.timelineDigest);
    expect(actual.sampleTimelineDigests).toEqual(expected.sampleTimelineDigests);
    expect(actual.display).toEqual(expected.display);
    expect(actual.keyRows).toEqual(expected.keyRows);
}

describe("simulation golden parity (pre-optimization oracle)", () => {
    if (GENERATE) {
        it("generates golden fixture from the unmodified engine", () => {
            const cases: Record<string, GoldenCaseRecord> = {};
            for (const goldenCase of GOLDEN_CASES) {
                const input = goldenCase.input();
                const result = runSimulation(input, goldenCase.options);
                cases[goldenCase.id] = recordGolden(goldenCase.id, input, goldenCase.options, result);
            }
            const thisFile = fileURLToPath(import.meta.url);
            const fixturePath = join(dirname(thisFile), "__fixtures__", "simulation-golden.json");
            writeFileSync(
                fixturePath,
                JSON.stringify(
                    {
                        note: "Phase 0 baseline oracle. Regenerate only from the pre-optimization engine or deliberately after a reviewed semantic change.",
                        cases
                    } satisfies GoldenFile,
                    null,
                    2
                ) + "\n"
            );
            console.log(`golden fixture written: ${fixturePath}`);
        });
    } else {
        for (const goldenCase of GOLDEN_CASES) {
            it(`matches golden oracle for ${goldenCase.id}`, () => {
                const input = goldenCase.input();
                const result = runSimulation(input, goldenCase.options);
                assertGoldenParity(goldenCase.id, input, goldenCase.options, result);
            });
        }

        it("replay of an early path equals its directly captured sample timeline", () => {
            const input = mcInput(32, 20260222);
            const result = runSimulation(input, { detailLevel: "full" });
            if (result.mode === "deterministic") throw new Error("expected distribution result");
            // Capture does not consume RNG: replaying path k from the seed must
            // reproduce the timeline captured inline during the full run.
            expect(result.sampleTimelines.length).toBeGreaterThan(0);
            const ctx = buildSimulationContext(input, undefined);
            for (let k = 0; k < result.sampleTimelines.length; k++) {
                const replayed = replayMonteCarloPath(input, ctx, k);
                expect(replayed).toEqual(result.sampleTimelines[k]);
            }
        });

        it("seed 0 is treated as a real seed (not falsy), reproducibly", () => {
            const first = runSimulation(mcInput(16, 0), { detailLevel: "full" });
            const second = runSimulation(mcInput(16, 0), { detailLevel: "full" });
            expect(digest(first)).toBe(digest(second));
            const unseeded = mcInput(16, 0);
            delete unseeded.simulation_settings.seed;
            const third = runSimulation(unseeded, { detailLevel: "full" });
            expect(third.summary.successRate).toBeGreaterThanOrEqual(0);
            expect(third.summary.successRate).toBeLessThanOrEqual(1);
        });
    }
});

describe("Phase 1 checkpoint replay parity", () => {
    function checkpointReplayTimeline(input: SimulationInput, targetIndex: number): TimelineRow[] {
        const ctx = buildSimulationContext(input, undefined);
        // Emulate the main loop: capture the RNG state right before path k,
        // then restore it and run that single path directly.
        setSeed(input.simulation_settings.seed);
        let checkpoint: number | null = null;
        for (let i = 0; i <= targetIndex; i++) {
            if (i === targetIndex) checkpoint = snapshotRngState();
            simulateMonteCarloPathOnce(input, ctx, { captureTimeline: false });
        }
        if (checkpoint === null) throw new Error("seeded run must produce a checkpoint");
        restoreRngState(checkpoint);
        return simulateMonteCarloPathOnce(input, ctx, { captureTimeline: true }).timeline;
    }

    for (const seed of [0, 1, 20260222, 2147483647]) {
        it(`checkpoint replay equals legacy replay (seed ${seed}), indices 0/1/mid/last`, () => {
            const input = mcInput(24, seed);
            const ctx = buildSimulationContext(input, undefined);
            for (const target of [0, 1, 12, 23]) {
                const legacy = replayMonteCarloPath(input, ctx, target);
                expect(checkpointReplayTimeline(input, target)).toEqual(legacy);
            }
        });

        it(`checkpoint replay equals legacy replay with longevity on (seed ${seed})`, () => {
            const input = mcInput(24, seed);
            input.longevity_risk = { useDistribution: true, averageLifeExpectancy: 83.5, stdDevYears: 5 };
            const ctx = buildSimulationContext(input, undefined);
            for (const target of [0, 5, 23]) {
                const legacy = replayMonteCarloPath(input, ctx, target);
                expect(checkpointReplayTimeline(input, target)).toEqual(legacy);
            }
        });
    }

    it("snapshot/restore reproduces the exact RNG sequence", () => {
        setSeed(4242);
        const prefix: number[] = [];
        for (let i = 0; i < 37; i++) prefix.push(randomNormal());
        const snap = snapshotRngState();
        const first: number[] = [];
        for (let i = 0; i < 50; i++) first.push(randomNormal());
        restoreRngState(snap);
        const second: number[] = [];
        for (let i = 0; i < 50; i++) second.push(randomNormal());
        expect(second).toEqual(first);
        expect(prefix.length).toBe(37);
    });

    it("setSeed produces identical streams (refactor fidelity)", () => {
        setSeed(20260222);
        const a = randomNormalArray(64, 0.005, 0.04);
        setSeed(20260222);
        const b = randomNormalArray(64, 0.005, 0.04);
        expect(a).toEqual(b);
    });

    it("unseeded mode snapshots null and replays via legacy fallback", () => {
        const input = mcInput(8, 5);
        delete input.simulation_settings.seed;
        setSeed(undefined);
        expect(snapshotRngState()).toBeNull();
        const ctx = buildSimulationContext(input, undefined);
        const timeline = replayMonteCarloPath(input, ctx, 3);
        expect(timeline.length).toBeGreaterThan(0);
        restoreRngState(null);
        expect(snapshotRngState()).toBeNull();
    });
});

describe("candidate micro-optimizations (parity + timing, no product change)", () => {
    it("Float64Array default sort matches comparator sort on simulation-like values", () => {
        setSeed(1234);
        const values = new Float64Array(10000);
        for (let i = 0; i < values.length; i++) {
            const kind = i % 7;
            if (kind === 0) values[i] = 0;
            else if (kind === 1) values[i] = -0;
            else if (kind === 2) values[i] = -(i * 137.5);
            else if (kind === 3) values[i] = (i % 13) * 1000; // ties
            else if (kind === 4) values[i] = 1e12 + i * 0.001; // large + tiny fraction
            else if (kind === 5) values[i] = (i + 1) * 1e-9; // tiny positives
            else values[i] = (randomNormal() * 1e8);
        }
        const withComparator = Float64Array.from(values).sort((a, b) => a - b);
        const withDefault = Float64Array.from(values).sort();
        // Known spec difference: TypedArray default sort orders -0 before +0,
        // while a comparator returning -0 keeps the original stable order.
        // Every mismatch must be a zero-sign-only swap; anything else fails.
        let zeroSignMismatches = 0;
        for (let i = 0; i < values.length; i++) {
            if (!Object.is(withComparator[i], withDefault[i])) {
                expect(withComparator[i] === 0 && withDefault[i] === 0).toBe(true);
                zeroSignMismatches++;
            }
        }
        // Real trajectory values cannot be -0: engine balances pass through
        // Math.max(0, ...) and totalAssetsReal is a sum of non-negatives
        // divided by cpi >= 1, so the zero-sign swap is unreachable in product.
        for (const p of [10, 25, 50, 75, 90]) {
            const fromDefault = percentileSorted(withDefault, p);
            const fromComparator = percentileSorted(withComparator, p);
            expect(fromDefault === fromComparator).toBe(true);
        }
        if (BENCH) {
            console.log(`sort zero-sign-only mismatches: ${zeroSignMismatches}`);
        }
        if (BENCH) {
            measure("sort(10000) comparator", 5, 15, () => {
                Float64Array.from(values).sort((a, b) => a - b);
            });
            measure("sort(10000) default", 5, 15, () => {
                Float64Array.from(values).sort();
            });
        }
    });

    it("histogram survival aggregation matches the double-loop implementation", () => {
        setSeed(99);
        const paths = 2000;
        const months = 540;
        const depletion = new Int32Array(paths);
        for (let i = 0; i < paths; i++) {
            const r = i % 10;
            depletion[i] = r < 4 ? -1 : r === 4 ? 0 : Math.floor(randomNormal() * 100 + 250);
            if (depletion[i] >= months) depletion[i] = months - 1;
        }
        const legacyStats = buildSurvivalStatsFromDepletionMonths(months, 45, depletion, paths);
        const legacySeries = buildSurvivalSeriesFromDepletionMonths(months, 45, depletion, paths);
        // Independent histogram + prefix-sum reference (test-local, not product code).
        const histogram = new Int32Array(months);
        for (let p = 0; p < paths; p++) {
            const d = depletion[p];
            if (d >= 0 && d < months) histogram[d]++;
        }
        let depletedSoFar = 0;
        const refRates: number[] = [];
        for (let m = 0; m < months; m++) {
            depletedSoFar += histogram[m];
            refRates.push(((paths - depletedSoFar) / Math.max(1, paths)) * 100);
        }
        expect(legacySeries.survivalRate).toEqual(refRates);
        let lowest = 100;
        let firstBelow: number | null = null;
        for (let m = 0; m < months; m++) {
            if (refRates[m] < lowest) lowest = refRates[m];
            if (firstBelow === null && refRates[m] < 100) firstBelow = Math.floor(45 + m / 12);
        }
        expect(legacyStats.lowestSurvivalRate).toBe(lowest);
        expect(legacyStats.firstBelowHundredPercentAge).toBe(firstBelow);
        expect(legacyStats.finalSurvivalRate).toBe(refRates[months - 1]);
        if (BENCH) {
            measure("survival current-impl", 3, 10, () => {
                buildSurvivalSeriesFromDepletionMonths(months, 45, depletion, paths);
            });
            measure("survival histogram", 3, 10, () => {
                const h = new Int32Array(months);
                for (let p = 0; p < paths; p++) {
                    const d = depletion[p];
                    if (d >= 0 && d < months) h[d]++;
                }
                let acc = 0;
                for (let m = 0; m < months; m++) {
                    acc += h[m];
                    void ((paths - acc) / Math.max(1, paths));
                }
            });
        }
    });

    it("typed-array normal values match randomNormalArray element-for-element", () => {
        const size = 720;
        setSeed(20260222);
        const legacy = randomNormalArray(size, 0.005, 0.04);
        setSeed(20260222);
        const typed = new Float64Array(size);
        for (let i = 0; i < size; i++) typed[i] = 0.005 + 0.04 * randomNormal();
        expect(Array.from(typed)).toEqual(legacy);
        if (BENCH) {
            measure("randomNormalArray+Array.from", 3, 10, () => {
                setSeed(7);
                randomNormalArray(size, 0.005, 0.04);
            });
            measure("randomNormalArray typed direct", 3, 10, () => {
                setSeed(7);
                const arr = new Float64Array(size);
                for (let i = 0; i < size; i++) arr[i] = 0.005 + 0.04 * randomNormal();
            });
        }
    });
});

describe("end-to-end scenario timings (PERF_BENCH=1 only)", () => {
    const maybe = BENCH ? it : it.skip;
    maybe("D-1 deterministic single path", () => {
        measure("D-1 deterministic", 5, 15, () => {
            runSimulation(deterministicInput(), { detailLevel: "full" });
        });
    });
    maybe("M-1 preview 80 paths", () => {
        measure("M-1 preview80", 5, 15, () => {
            runSimulation(mcInput(500, 11), { detailLevel: "preview", previewPathCap: 80 });
        });
    });
    maybe("M-2 MC 100 full", () => {
        measure("M-2 mc100", 5, 15, () => {
            runSimulation(mcInput(100, 12), { detailLevel: "full" });
        });
    });
});

describe("heavy matrix (PERF_FULL=1 only)", () => {
    const heavy = FULL && BENCH ? it : it.skip;
    heavy("M-3 MC 1000 full", () => {
        measure("M-3 mc1000", 3, 5, () => {
            runSimulation(mcInput(1000, 13), { detailLevel: "full" });
        });
    }, 300000);
    heavy("M-4 MC 5000 full", () => {
        measure("M-4 mc5000", 2, 3, () => {
            runSimulation(mcInput(5000, 14), { detailLevel: "full" });
        });
    }, 300000);
    heavy("M-5 MC 10000 full", () => {
        measure("M-5 mc10000", 2, 3, () => {
            runSimulation(mcInput(10000, 15), { detailLevel: "full" });
        });
    }, 600000);
    heavy("M-6 MC 10000 no samples", () => {
        measure("M-6 mc10000-nosamples", 2, 3, () => {
            runSimulation(mcInput(10000, 16), {
                detailLevel: "full",
                includeSampleTimelines: false,
                maxSampleTimelines: 0
            });
        });
    }, 600000);
    heavy("M-7 MC 10000 trajectory off", () => {
        measure("M-7 mc10000-notraj", 2, 3, () => {
            runSimulation(mcInput(10000, 17), {
                detailLevel: "full",
                includeTrajectoryStats: false,
                includeSurvivalSeries: false
            });
        });
    }, 600000);
    heavy("M-8 MC 10000 longevity on", () => {
        const input = mcInput(10000, 18);
        input.longevity_risk = { useDistribution: true, averageLifeExpectancy: 83.5, stdDevYears: 5 };
        measure("M-8 mc10000-longevity", 2, 3, () => {
            runSimulation(input, { detailLevel: "full" });
        });
    }, 600000);
    heavy("H-1 historical full", () => {
        const input = baseKernelInput();
        input.simulation_settings = { mode: "historical", mc_paths: 100 };
        measure("H-1 historical", 3, 5, () => {
            runSimulation(input, { detailLevel: "full" });
        });
    }, 300000);
    heavy("replay cost vs full run at 1000 paths", () => {
        const input = mcInput(1000, 19);
        const ctx = buildSimulationContext(input, undefined);
        measure("replay last path (legacy loop)", 1, 3, () => {
            replayMonteCarloPath(input, ctx, 999);
        });
        measure("M-3 full run for reference", 1, 3, () => {
            runSimulation(input, { detailLevel: "full" });
        });
    }, 600000);
});
