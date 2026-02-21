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

export const ScenarioManager = React.memo(function ScenarioManager({ currentInput, onLoad }: Props) {
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
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all mb-4 w-full text-slate-900 dark:text-slate-100">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800 mt-0">시나리오 관리</h3>

            <div className="mb-4">
                <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">빠른 설정 (템플릿):</div>
                <div className="flex flex-wrap gap-2">
                    {QUICK_PRESETS.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => load(p.apply(currentInput), `'${p.name}' 설정을 불러오시겠습니까?`)}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-full text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors active:scale-95 cursor-pointer"
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-zinc-800 my-4" />

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-w-0"
                    placeholder="현재 설정 저장 (예: 주식위주 40세)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <button onClick={save} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer">
                    프리셋 저장
                </button>
            </div>

            {/* Import/Export Data */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 dark:bg-zinc-800 border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer text-center">
                    📂 설정 불러오기
                    <input type="file" accept=".json" className="hidden" onChange={(e) => {
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
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all cursor-pointer active:scale-95"
                >
                    💾 설정 내보내기
                </button>
            </div>

            <div className="flex flex-col gap-2">
                {scenarios.length === 0 && <div className="text-slate-400 dark:text-slate-500 text-sm p-4 text-center border-2 border-dashed border-slate-100 dark:border-zinc-800 rounded-xl">저장된 커스텀 시나리오가 없습니다.</div>}
                {scenarios.map(s => (
                    <div
                        key={s.id}
                        onClick={() => load(s.input, `'${s.name}' 시나리오를 불러오시겠습니까?`)}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-200 dark:hover:border-blue-900/30 transition-all cursor-pointer group"
                    >
                        <div className="flex-1 min-w-0 pr-2">
                            <div className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{s.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{new Date(s.updatedAt).toLocaleDateString()} 저장됨</div>
                        </div>
                        <button
                            onClick={(e) => remove(s.id, e)}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-600 text-red-500 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:border-red-900/30 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                            삭제
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
});
