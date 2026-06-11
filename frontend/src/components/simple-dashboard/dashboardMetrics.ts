import type { SimulationInput, SimulationResult } from "../../logic/types";
import { getFeedback, getGaugeColor } from "./summaryHelpers";

export function deriveSimpleDashboardMetrics(input: SimulationInput, result: SimulationResult | null) {
    const successRate = result?.summary.successRate ?? 0;
    const retirementAsset = result?.summary.retirementPoint?.totalAssetsReal ?? result?.summary.terminalStats?.totalAssetsReal.p50 ?? 0;
    const finalAsset = result?.summary.terminalStats?.totalAssetsReal.p50 ?? result?.summary.finalTotalAssetsReal ?? 0;
    const currentAsset = input.general.current_balance + input.private_pension.current_balance;
    const yearsToRetire = Math.max(0, input.retire_age - input.current_age);
    const clampedSuccessRate = Math.max(0, Math.min(1, successRate));
    const gaugeColor = getGaugeColor(clampedSuccessRate);
    const gaugeRadius = 70;
    const gaugeLength = Math.PI * gaugeRadius;
    const gaugeOffset = gaugeLength * (1 - clampedSuccessRate);
    const feedback = getFeedback(successRate);

    return {
        successRate,
        retirementAsset,
        finalAsset,
        currentAsset,
        yearsToRetire,
        clampedSuccessRate,
        gaugeColor,
        gaugeRadius,
        gaugeLength,
        gaugeOffset,
        feedback,
    };
}
