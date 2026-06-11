import { MAX_FULL_MONTE_CARLO_PATHS } from "../runtimeLimits";
import type { SimulationInput } from "../types";

const VALID_SIMULATION_MODES = new Set(["deterministic", "montecarlo", "historical"]);

export function assertSimulationInputCanRun(input: SimulationInput): void {
    if (!Number.isFinite(input.current_age) || !Number.isFinite(input.retire_age) || !Number.isFinite(input.end_age)) {
        throw new Error("나이 입력값은 유한한 숫자여야 합니다.");
    }
    if (input.end_age <= input.current_age) {
        throw new Error("종료 나이는 현재 나이보다 커야 합니다.");
    }
    if (input.retire_age > input.end_age) {
        throw new Error("은퇴 나이는 종료 나이보다 클 수 없습니다.");
    }
    if (!VALID_SIMULATION_MODES.has(input.simulation_settings.mode)) {
        throw new Error("시뮬레이션 모드가 유효하지 않습니다.");
    }
    if (
        input.simulation_settings.mode === "montecarlo" &&
        Number.isFinite(input.simulation_settings.mc_paths) &&
        input.simulation_settings.mc_paths > MAX_FULL_MONTE_CARLO_PATHS
    ) {
        throw new Error(`시뮬레이션 횟수는 ${MAX_FULL_MONTE_CARLO_PATHS.toLocaleString()}회 이하여야 합니다.`);
    }
}
