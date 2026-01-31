import React from "react";
import { WithdrawalPolicy, WithdrawalStrategy } from "../logic/types";

interface Props {
    withdrawal: WithdrawalPolicy;
    onChange: (w: WithdrawalPolicy) => void;
}

const STRATEGIES: { id: WithdrawalStrategy; label: string; desc: string }[] = [
    { id: "target_spending", label: "목표 생활비 충당 (Gap Filler)", desc: "국민/개인연금으로 부족한 금액만큼만 인출합니다." },
    { id: "fixed_amount", label: "고정 금액 인출", desc: "매월 정해진 금액을 무조건 인출합니다." },
    { id: "fixed_percentage", label: "자산 비율 인출 (정율)", desc: "현재 잔액의 N%를 매년(월할) 인출합니다." },
    { id: "safe_withdrawal_rate", label: "4% 룰 (Safe Withdrawal Rate)", desc: "초기 자산의 N%를 인출하되, 물가 상승분을 반영하여 구매력을 유지합니다." },
    { id: "vpw", label: "가변 인출 (VPW)", desc: "기대 수명을 고려하여, 자산이 고갈되지 않으면서 수익률에 따라 인출액을 조절합니다." },
];

export function WithdrawalSettings({ withdrawal, onChange }: Props) {

    const updateField = (field: keyof WithdrawalPolicy, value: any) => {
        onChange({ ...withdrawal, [field]: value });
    };

    return (
        <div className="card mt-2">
            <h3 className="card-header">은퇴 후 인출 전략</h3>

            <div className="input-group">
                <label className="label">전략 선택</label>
                <select
                    className="select"
                    value={withdrawal.strategy}
                    onChange={(e) => updateField("strategy", e.target.value)}
                >
                    {STRATEGIES.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                </select>
                <div className="text-sm text-sub mt-2">
                    {STRATEGIES.find(s => s.id === withdrawal.strategy)?.desc}
                </div>
            </div>

            {/* Strategy specific inputs */}
            {withdrawal.strategy === "target_spending" && (
                <div className="input-group">
                    <label className="label">월 목표 생활비</label>
                    <input
                        className="input"
                        type="number"
                        value={withdrawal.targetMonthlySpending}
                        onChange={(e) => updateField("targetMonthlySpending", Number(e.target.value))}
                    />
                </div>
            )}

            {withdrawal.strategy === "fixed_amount" && (
                <div className="input-group">
                    <label className="label">월 고정 인출액</label>
                    <input
                        className="input"
                        type="number"
                        value={withdrawal.fixedMonthlyAmount}
                        onChange={(e) => updateField("fixedMonthlyAmount", Number(e.target.value))}
                    />
                </div>
            )}

            {withdrawal.strategy === "fixed_percentage" && (
                <div className="input-group">
                    <label className="label">연 인출 비율 (0~1)</label>
                    <input
                        className="input"
                        type="number" step="0.005"
                        value={withdrawal.percentageRate}
                        placeholder="예: 0.04"
                        onChange={(e) => updateField("percentageRate", Number(e.target.value))}
                    />
                </div>
            )}

            {withdrawal.strategy === "safe_withdrawal_rate" && (
                <div className="input-group">
                    <label className="label">초기 인출 비율 (0~1)</label>
                    <input
                        className="input"
                        type="number" step="0.005"
                        value={withdrawal.initialSafeRate ?? 0.04}
                        placeholder="기본값: 0.04 (4%)"
                        onChange={(e) => updateField("initialSafeRate", Number(e.target.value))}
                    />
                    <div className="alert alert-info mt-2">
                        * 목표 생활비는 자동으로 계산됩니다 (은퇴 시 자산 * 4% / 12)
                    </div>
                </div>
            )}

            {withdrawal.strategy === "vpw" && (
                <div>
                    <div className="text-sm text-sub mb-4">
                        VPW는 기대 수명과 포트폴리오 수익률에 따라 매년 최적의 인출률을 계산합니다.
                    </div>
                    <div className="input-group">
                        <label className="label">최대 인출률 상한 (선택사항, 0~1)</label>
                        <input
                            className="input"
                            type="number" step="0.01"
                            value={withdrawal.vpwMaxWithdrawalRate || ""}
                            placeholder="예: 0.1 (10%)"
                            onChange={(e) => updateField("vpwMaxWithdrawalRate", e.target.value ? Number(e.target.value) : undefined)}
                        />
                    </div>
                    <div className="input-group">
                        <label className="label">최소 인출률 하한 (선택사항, 0~1)</label>
                        <input
                            className="input"
                            type="number" step="0.01"
                            value={withdrawal.vpwMinWithdrawalRate || ""}
                            placeholder="예: 0.02 (2%)"
                            onChange={(e) => updateField("vpwMinWithdrawalRate", e.target.value ? Number(e.target.value) : undefined)}
                        />
                    </div>
                </div>
            )}

            <hr style={{ margin: "20px 0", borderTop: "1px dashed var(--border)", borderBottom: "none" }} />

            <h4 className="text-main font-bold mb-4" style={{ fontSize: "0.9rem" }}>세금 설정</h4>
            <div>
                <div className="input-group">
                    <label className="label">세금 방식</label>
                    <select
                        className="select"
                        value={withdrawal.taxStrategy || "simple"}
                        onChange={(e) => updateField("taxStrategy", e.target.value)}
                    >
                        <option value="simple">단일 세율 (Simple)</option>
                        <option value="detailed">종합과세 누진세율 (Detailed)</option>
                    </select>

                    {(!withdrawal.taxStrategy || withdrawal.taxStrategy === "simple") && (
                        <div className="mt-2">
                            <label className="label">인출 시 예상 실효세율 (0~1)</label>
                            <input
                                className="input"
                                type="number" step="0.01" max="0.5"
                                value={withdrawal.taxRate}
                                onChange={(e) => updateField("taxRate", Number(e.target.value))}
                            />
                            <div className="text-xs text-sub mt-2">
                                예: 연금저축/IRP(3.3%~5.5%), 해외주식(22%), 일반계좌(15.4%).
                            </div>
                        </div>
                    )}

                    {withdrawal.taxStrategy === "detailed" && (
                        <div className="alert alert-info mt-2">
                            * 연금 + 인출액 합계에 대해 한국 소득세 기본세율(6%~45%)과 누진공제를 적용하여 세금을 계산합니다.<br />
                            (기본공제 150만원 가정, 지방소득세 별도)
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
