import React from "react";
import { GoalPlanner } from "../../GoalPlanner";
import type { SimulationInput } from "../../../logic/types";

interface GoalSectionProps {
    input: SimulationInput;
    setInput: React.Dispatch<React.SetStateAction<SimulationInput>>;
}

export function GoalSection({ input, setInput }: GoalSectionProps) {
    return <GoalPlanner input={input} onApply={setInput} />;
}

