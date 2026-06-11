import type { SimulationInput } from "../../logic/types";
import {
    createPlanFileEnvelope,
    legacyInputToPlan,
    parseImportedPlanEnvelope,
    planToLegacyInput,
} from "../../logic/plan";
import { validateSimulationInput, validateSimulationPlan } from "../../logic/validation";
import { formatBytes, MAX_PLAN_IMPORT_BYTES } from "../../logic/runtimeLimits";

type ConfirmLoad = (input: SimulationInput, message?: string) => void;

export function importScenarioFile(file: File, confirmLoad: ConfirmLoad): void {
    if (file.size > MAX_PLAN_IMPORT_BYTES) {
        window.alert(
            `플랜 JSON 파일은 ${formatBytes(MAX_PLAN_IMPORT_BYTES)} 이하만 가져올 수 있습니다. 현재 파일 크기: ${formatBytes(file.size)}`
        );
        return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
        try {
            if (typeof event.target?.result !== "string") {
                window.alert("선택한 파일을 텍스트로 읽지 못했습니다. UTF-8 JSON 파일인지 확인해주세요.");
                return;
            }

            const json = JSON.parse(event.target.result);
            const importedPlan = parseImportedPlanEnvelope(json);

            if (!importedPlan) {
                window.alert("v2 또는 v3 플랜 JSON 구조만 가져올 수 있습니다.");
                return;
            }

            const planWarnings = validateSimulationPlan(importedPlan);
            const planErrors = planWarnings.filter((warning) => warning.severity === "error");
            if (planErrors.length > 0) {
                window.alert(
                    `가져온 플랜이 유효하지 않습니다:\n${planErrors.map((warning) => warning.message).join("\n")}`
                );
                return;
            }

            const importedInput = planToLegacyInput(importedPlan);
            const warnings = validateSimulationInput(importedInput);
            const blockingErrors = warnings.filter((warning) => warning.severity === "error");

            if (blockingErrors.length > 0) {
                window.alert(
                    `가져온 시나리오에 실행을 막는 오류가 있습니다:\n${blockingErrors.map((warning) => warning.message).join("\n")}`
                );
                return;
            }

            const warningMessage =
                warnings.length > 0
                    ? `경고:\n${warnings.map((warning) => warning.message).join("\n")}\n\n그래도 불러올까요?`
                    : "가져온 플랜을 불러올까요?";

            confirmLoad(importedInput, warningMessage);
        } catch (error) {
            console.error("Failed to import plan JSON", error);
            window.alert("선택한 파일을 JSON으로 해석하지 못했습니다. UTF-8로 저장된 플랜 JSON인지 확인해주세요.");
        }
    };
    reader.onerror = () => {
        window.alert("선택한 파일을 읽는 중 오류가 발생했습니다. 다른 위치에 복사한 뒤 다시 시도해주세요.");
    };
    reader.onabort = () => {
        window.alert("플랜 JSON 가져오기가 취소되었습니다.");
    };

    reader.readAsText(file);
}

export function exportScenarioFile(input: SimulationInput): void {
    const payload = createPlanFileEnvelope(legacyInputToPlan(input));
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `retirement_plan_v3_${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
}
