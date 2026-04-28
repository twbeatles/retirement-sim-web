import type { SimulationPlanV3 } from "../../logic/plan";

export type ApplyPlan = (updater: (draft: SimulationPlanV3) => void) => void;
