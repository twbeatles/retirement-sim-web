import {
    getRepresentativeLedgerTimeline,
    getRepresentativeTimeline,
    getSampleDisplayPaths
} from "../../../logic/resultDisplay";
import type { SimulationInput, SimulationResult } from "../../../logic/types";

export function deriveResultDisplayData(input: SimulationInput, result: SimulationResult | null) {
    const timeline = result ? getRepresentativeTimeline(result) : [];
    const samplePaths = result ? getSampleDisplayPaths(result) : [];
    const summary = result?.summary;
    const isPreviewResult = result?.detailLevel === "preview";
    const simulationCount = result
        ? result.mode === "deterministic"
            ? 1
            : result.pathCount
        : input.simulation_settings.mc_paths;
    const retirementRealAssets = summary
        ? result?.mode === "deterministic"
            ? (summary.retirementPoint?.totalAssetsReal ?? summary.finalTotalAssetsReal)
            : (summary.retirementPoint?.totalAssetsReal ?? summary.terminalStats.totalAssetsReal.p50 ?? summary.finalTotalAssetsReal)
        : 0;
    const finalRealAssets = summary
        ? result?.mode === "deterministic"
            ? summary.finalTotalAssetsReal
            : (summary.terminalStats.totalAssetsReal.p50 ?? summary.finalTotalAssetsReal)
        : 0;
    const sourceLabel = summary?.source === "historical"
        ? "역사적 백테스트"
        : summary?.source === "montecarlo"
            ? "몬테카를로"
            : "결정론";
    const modeLabel = summary?.calculationMode === "distribution" ? "분포 분석" : "단일 경로";

    return {
        timeline,
        samplePaths,
        summary,
        isPreviewResult,
        simulationCount,
        retirementRealAssets,
        finalRealAssets,
        sourceLabel,
        modeLabel,
    };
}

export function deriveLedgerSummary(result: SimulationResult | null) {
    const ledgerTimeline = result ? getRepresentativeLedgerTimeline(result) : [];
    if (!ledgerTimeline || ledgerTimeline.length === 0) {
        return null;
    }

    const retirementStartIndex = ledgerTimeline.findIndex((row) => row.isRetired);
    const sourceRows = retirementStartIndex >= 0
        ? ledgerTimeline.slice(retirementStartIndex, retirementStartIndex + 12)
        : ledgerTimeline.slice(0, 12);

    if (sourceRows.length === 0) {
        return null;
    }

    const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const essentialBaseline = average(
        sourceRows.map((row) => row.expenses.essential + row.expenses.housing + row.expenses.medicalBaseline)
    );
    const coveredMonths = sourceRows.filter(
        (row) => row.incomes.totalNet >= (row.expenses.essential + row.expenses.housing + row.expenses.medicalBaseline)
    ).length;
    const averageCoverageRatio = essentialBaseline > 0
        ? average(sourceRows.map((row) => row.incomes.totalNet / Math.max(1, row.expenses.essential + row.expenses.housing + row.expenses.medicalBaseline)))
        : 1;

    return {
        rows: sourceRows,
        avgNetIncome: average(sourceRows.map((row) => row.incomes.totalNet)),
        avgTotalExpense: average(sourceRows.map((row) => row.expenses.total)),
        avgTax: average(sourceRows.map((row) => row.tax.taxPaid)),
        avgHealthInsurance: average(sourceRows.map((row) => row.expenses.healthInsurancePremium)),
        essentialBaseline,
        coveredMonthRate: coveredMonths / sourceRows.length,
        averageCoverageRatio
    };
}
