import React, { useState, useEffect } from "react";
import { SimulationInput } from "../logic/types";
import { validateSimulationInput } from "../logic/validation";

import { scenarioStorage, SavedScenario } from "../services/storage";

interface Props {
    currentInput: SimulationInput;
    onLoad: (input: SimulationInput) => void;
}

// Hardcoded Quick Presets (Templates)
const QUICK_PRESETS = [
    {
        name: "🔥 FIRE족 (40세 은퇴)",
        apply: (base: SimulationInput): SimulationInput => ({
            ...base,
            current_age: 30,
            retire_age: 40,
            end_age: 95,
            general: { ...base.general, monthly_contribution: 3000000 }, // Aggressive saving
            withdrawal: { ...base.withdrawal, strategy: "safe_withdrawal_rate", initialSafeRate: 0.035 } // Conservative SWR for long horizon
        })
    },
    {
        name: "🏢 일반 직장인 (60세 은퇴)",
        apply: (base: SimulationInput): SimulationInput => ({
            ...base,
            current_age: 35,
            retire_age: 60,
            end_age: 90,
            general: { ...base.general, monthly_contribution: 1000000 },
            national_pension: { ...base.national_pension, startAge: 65, expected_monthly_benefit_at_retirement: 1500000 }
        })
    },
    {
        name: "💰 금수저 (초기자산 많음)",
        apply: (base: SimulationInput): SimulationInput => ({
            ...base,
            current_age: 30,
            retire_age: 50,
            general: { ...base.general, current_balance: 500000000, monthly_contribution: 500000 }, // 5억 시작
        })
    }
];

export function ScenarioManager({ currentInput, onLoad }: Props) {
    const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
    const [name, setName] = useState("");

    const loadScenarios = async () => {
        try {
            const list = await scenarioStorage.getAllScenarios();
            setScenarios(list);
        } catch (e) {
            console.error("Failed to load scenarios", e);
        }
    };

    useEffect(() => {
        loadScenarios();
    }, []);

    const save = async () => {
        if (!name.trim()) return alert("시나리오 이름을 입력해주세요.");
        try {
            await scenarioStorage.saveScenario(name, currentInput);
            await loadScenarios();
            setName("");
        } catch (e) {
            alert("저장 중 오류가 발생했습니다.");
            console.error(e);
        }
    };

    const load = (data: SimulationInput, msg?: string) => {
        if (confirm(msg || "현재 입력된 내용은 덮어씌워집니다. 진행하시겠습니까?")) {
            onLoad(data);
        }
    };

    const remove = async (id: number | undefined, e: React.MouseEvent) => {
        e.stopPropagation();
        if (id === undefined) return;
        if (confirm("정말 삭제하시겠습니까?")) {
            try {
                await scenarioStorage.deleteScenario(id);
                await loadScenarios();
            } catch (error) {
                console.error("Failed to delete", error);
            }
        }
    };

    return (
        <div className="card mb-4">
            <h3 className="card-header mt-0">시나리오 관리</h3>

            <div className="mb-4">
                <div className="text-sm text-sub mb-2">빠른 설정 (템플릿):</div>
                <div className="flex-row flex-wrap">
                    {QUICK_PRESETS.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => load(p.apply(currentInput), `'${p.name}' 설정을 불러오시겠습니까?`)}
                            className="btn btn-pill"
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="scenario-divider" />

            <div className="flex-row mb-4">
                <input
                    className="input scenario-flex-1"
                    placeholder="현재 설정 저장 (예: 주식위주 40세)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <button onClick={save} className="btn btn-primary scenario-nowrap">
                    프리셋 저장
                </button>
            </div>

            {/* Import/Export Data */}
            <div className="flex-row mb-4">
                <label className="scenario-import-label">
                    📂 설정 불러오기
                    <input type="file" accept=".json" className="scenario-file-input" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            try {
                                const json = JSON.parse(ev.target?.result as string);

                                // Validate using comprehensive validator
                                const warnings = validateSimulationInput(json as SimulationInput);
                                const errors = warnings.filter(w => w.severity === 'error');

                                if (errors.length > 0) {
                                    alert(`올바르지 않은 데이터입니다:\n${errors.map(e => e.message).join('\n')}`);
                                    return;
                                }

                                if (json.current_age && json.portfolio) {
                                    load(json as SimulationInput, warnings.length > 0
                                        ? `경고 사항이 있습니다:\n${warnings.map(w => w.message).join('\n')}\n\n그래도 불러오시겠습니까?`
                                        : "파일에서 설정을 불러오시겠습니까?");
                                } else {
                                    alert("필수 데이터가 누락되었습니다.");
                                }
                            } catch (err) {
                                alert("파일을 읽는 중 오류가 발생했습니다.");
                            }
                        };
                        reader.readAsText(file);
                        e.target.value = ""; // reset
                    }} />
                </label>
                <button
                    onClick={() => {
                        const json = JSON.stringify(currentInput, null, 2);
                        const blob = new Blob([json], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `retirement_sim_${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }}
                    className="btn btn-secondary scenario-flex-1"
                >
                    💾 설정 내보내기
                </button>
            </div>

            <div className="flex-col">
                {scenarios.length === 0 && <div className="text-sub text-sm text-center p-2">저장된 커스텀 시나리오가 없습니다.</div>}
                {scenarios.map(s => (
                    <div
                        key={s.id}
                        onClick={() => load(s.input, `'${s.name}' 시나리오를 불러오시겠습니까?`)}
                        className="scenario-item"
                    >
                        <div>
                            <div className="font-bold text-sm text-main">{s.name}</div>
                            <div className="text-xs text-sub">{new Date(s.updatedAt).toLocaleDateString()} 저장됨</div>
                        </div>
                        <button
                            onClick={(e) => remove(s.id, e)}
                            className="btn btn-sm scenario-delete-btn"
                        >
                            삭제
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
