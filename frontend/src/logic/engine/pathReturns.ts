import type { SimulationInput } from "../types";
import { randomNormalArray } from "../math";
import type { SimulationContext } from "./types";

export function createMonthlyGeneralReturns(
    input: SimulationInput,
    ctx: SimulationContext,
    stochastic: boolean,
    historicalPathIndex?: number
): number[] | Float64Array {
    const { mu_m, sig_m, monthsToRetire, totalMonths } = ctx;
    const historicalOffset = historicalPathIndex !== undefined ? historicalPathIndex * 12 : 0;

    if (ctx.historicalReturns && ctx.historicalReturns.length > 0 && historicalPathIndex !== undefined) {
        const returns = new Float64Array(totalMonths);
        for (let m = 0; m < totalMonths; m++) {
            const idx = (historicalOffset + m) % ctx.historicalReturns.length;
            returns[m] = ctx.historicalReturns[idx];
        }
        return returns;
    }

    if (stochastic) {
        const returns = randomNormalArray(totalMonths, mu_m, sig_m);
        if (input.stress_test?.enabled) {
            const st = input.stress_test;
            const startM = st.startFromRetirement ? monthsToRetire : 0;
            const endM = Math.min(totalMonths, startM + st.durationMonths);
            const factor = Math.pow(1 - st.annualDeclineRate, 1.0 / 12.0) - 1;

            for (let m = startM; m < endM; m++) {
                returns[m] = factor;
            }
        }
        return returns;
    }

    return new Float64Array(totalMonths).fill(mu_m);
}
