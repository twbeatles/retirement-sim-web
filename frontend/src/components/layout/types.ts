import type { Dispatch, SetStateAction } from "react";
import type { AnalysisTabType } from "../../logic/uiConstants";
import type { SimulationInput, SimulationResult, ValidationWarning } from "../../logic/types";

export type LayoutSectionId = "basic" | "assets" | "pension" | "goal" | "advanced" | "results";
export type SidebarSectionId = Exclude<LayoutSectionId, "results">;

export interface LayoutSharedProps {
    input: SimulationInput;
    setInput: Dispatch<SetStateAction<SimulationInput>>;
    result: SimulationResult | null;
    validationWarnings: ValidationWarning[];
    sidebarTab: SidebarSectionId;
    setSidebarTab: (tab: SidebarSectionId) => void;
    analysisTab: AnalysisTabType;
    setAnalysisTab: (tab: AnalysisTabType) => void;
    onPrint: () => void;
}

export type { AnalysisTabType };
