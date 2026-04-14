import type { SimulationInput } from "../types";

export function calculatePortfolioMetrics(input: SimulationInput) {
    const assets = input.portfolio.assetClasses;

    let weightedReturn = 0;
    let totalAlloc = 0;

    assets.forEach((asset) => {
        weightedReturn += asset.expectedAnnualReturn * asset.allocation;
        totalAlloc += asset.allocation;
    });

    if (totalAlloc > 0) {
        weightedReturn /= totalAlloc;
    }

    const rho = input.portfolio.manualCorrelation ?? 1.0;
    let varianceSum = 0;

    for (let i = 0; i < assets.length; i++) {
        for (let j = 0; j < assets.length; j++) {
            const w_i = assets[i].allocation;
            const w_j = assets[j].allocation;
            const sig_i = assets[i].annualVolatility;
            const sig_j = assets[j].annualVolatility;

            varianceSum += i === j
                ? w_i * w_j * sig_i * sig_j
                : w_i * w_j * rho * sig_i * sig_j;
        }
    }

    if (totalAlloc > 0 && Math.abs(totalAlloc - 1.0) > 0.001) {
        varianceSum /= (totalAlloc * totalAlloc);
    }

    return {
        mu: weightedReturn,
        sigma: Math.sqrt(Math.max(0, varianceSum))
    };
}
