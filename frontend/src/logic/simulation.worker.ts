/// <reference lib="webworker" />

import { planToLegacyInput } from "./plan";
import { runSimulationPlan, runSimulationPlanBatch } from "./planSimulation";
import { optimizePensionStartAge, solveForLaborSavingsRate, solveForMonthlyContribution, solveForRetirementAge } from "./solver";
import { runSensitivityAnalysis } from "./riskAnalysis";
import {
    type AnyWorkerRequest,
    type WorkerRequestByKind,
    type WorkerResponse
} from "./workerTypes";

// Worker context
const ctx = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<AnyWorkerRequest>) => {
    const msg = event.data;

    try {
        let responsePayload: unknown;

        switch (msg.kind) {
            case "SIMULATION": {
                const payload = msg.payload as WorkerRequestByKind["SIMULATION"];
                responsePayload = runSimulationPlan(payload.plan, payload.options);
                break;
            }
            case "SIMULATION_BATCH": {
                const payload = msg.payload as WorkerRequestByKind["SIMULATION_BATCH"];
                responsePayload = runSimulationPlanBatch(payload.plans, payload.options);
                break;
            }
            case "SOLVE_CONTRIBUTION": {
                const payload = msg.payload as WorkerRequestByKind["SOLVE_CONTRIBUTION"];
                responsePayload = solveForMonthlyContribution(
                    planToLegacyInput(payload.plan),
                    payload.targetSuccessRate
                );
                break;
            }
            case "SOLVE_LABOR_SAVINGS_RATE": {
                const payload = msg.payload as WorkerRequestByKind["SOLVE_LABOR_SAVINGS_RATE"];
                responsePayload = solveForLaborSavingsRate(
                    planToLegacyInput(payload.plan),
                    payload.targetSuccessRate
                );
                break;
            }
            case "SOLVE_RETIRE_AGE": {
                const payload = msg.payload as WorkerRequestByKind["SOLVE_RETIRE_AGE"];
                responsePayload = solveForRetirementAge(
                    planToLegacyInput(payload.plan),
                    payload.targetSuccessRate
                );
                break;
            }
            case "SENSITIVITY_ANALYSIS": {
                const payload = msg.payload as WorkerRequestByKind["SENSITIVITY_ANALYSIS"];
                responsePayload = runSensitivityAnalysis(
                    planToLegacyInput(payload.plan),
                    payload.parameter,
                    payload.variations
                );
                break;
            }
            case "PENSION_OPTIMIZATION": {
                const payload = msg.payload as WorkerRequestByKind["PENSION_OPTIMIZATION"];
                responsePayload = optimizePensionStartAge(planToLegacyInput(payload.plan));
                break;
            }
            default:
                throw new Error("Unknown message kind");
        }

        const response: WorkerResponse = {
            requestId: msg.requestId,
            kind: msg.kind,
            status: "success",
            payload: responsePayload as never
        };
        ctx.postMessage(response);

    } catch (error) {
        const errorResponse: WorkerResponse = {
            requestId: msg.requestId,
            kind: msg.kind,
            status: "error",
            error: error instanceof Error ? error.message : String(error)
        };
        ctx.postMessage(errorResponse);
    }
};

export { }; // Ensure it's treated as a module

