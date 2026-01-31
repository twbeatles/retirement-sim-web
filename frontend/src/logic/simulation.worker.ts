import { runSimulation } from "./engine";
import { solveForMonthlyContribution, solveForRetirementAge } from "./solver";
import { runSensitivityAnalysis } from "./riskAnalysis";
import { WorkerRequest, WorkerResponse } from "./workerTypes";

// Worker context
const ctx: Worker = self as any;

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
    try {
        const msg = event.data;
        let responsePayload: any;

        switch (msg.type) {
            case 'SIMULATION': {
                responsePayload = runSimulation(msg.input);
                break;
            }
            case 'SOLVE_CONTRIBUTION': {
                responsePayload = solveForMonthlyContribution(msg.input, msg.targetSuccessRate);
                break;
            }
            case 'SOLVE_RETIRE_AGE': {
                responsePayload = solveForRetirementAge(msg.input, msg.targetSuccessRate);
                break;
            }
            case 'SENSITIVITY_ANALYSIS': {
                // Run sensitivity analysis for the specified parameter
                responsePayload = runSensitivityAnalysis(msg.input, msg.parameter, msg.variations);
                break;
            }
            default:
                throw new Error("Unknown message type");
        }

        const response: WorkerResponse = { type: 'SUCCESS', payload: responsePayload };
        ctx.postMessage(response);

    } catch (error) {
        const errorResponse: WorkerResponse = {
            type: 'ERROR',
            payload: error instanceof Error ? error.message : String(error)
        };
        ctx.postMessage(errorResponse);
    }
};

export { }; // Ensure it's treated as a module

