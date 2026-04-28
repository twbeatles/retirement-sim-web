import { getRepresentativeLedgerTimeline, getRepresentativePath, getRepresentativeTimeline, getSampleDisplayPaths } from "./resultDisplay";
import { type LedgerTimelineRow, type SimulationResult, type TimelineRow } from "./types";

function downloadBlob(content: string, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const pom = document.createElement('a');
    pom.href = url;
    pom.setAttribute('download', filename);
    pom.click();
    // Clean up the URL object to prevent memory leaks
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

function formatResultMode(mode: SimulationResult["mode"]): string {
    if (mode === "historical") return "역사적 백테스트";
    if (mode === "montecarlo") return "몬테카를로";
    return "결정론";
}

function formatCalculationMode(mode: SimulationResult["summary"]["calculationMode"]): string {
    return mode === "distribution" ? "분포 분석" : "단일 경로";
}

function formatResultSource(source: SimulationResult["summary"]["source"]): string {
    if (source === "historical") return "역사적 백테스트";
    if (source === "montecarlo") return "몬테카를로";
    return "결정론";
}

function convertTimelineToCSV(timeline: TimelineRow[]): string {
    if (!timeline || timeline.length === 0) {
        return "타임라인 데이터가 없습니다";
    }

    const headers = [
        "월",
        "나이",
        "은퇴 여부",
        "일반 자산 잔액",
        "개인연금 잔액",
        "부동산",
        "추가 연금",
        "부채",
        "총자산(명목)",
        "총자산(실질)",
        "국민연금 소득",
        "개인연금 소득",
        "추가 연금 소득",
        "인출액(세전)",
        "인출액(세후)",
        "납부 세금",
        "총 순소득"
    ];

    const rows = timeline.map(r => [
        r.month,
        r.age.toFixed(1),
        r.isRetired ? "예" : "아니오",
        Math.round(r.general),
        Math.round(r.privatePension),
        Math.round(r.realEstate || 0),
        Math.round(r.additionalPension || 0),
        Math.round(r.debt),
        Math.round(r.totalAssets),
        Math.round(r.totalAssetsReal),
        Math.round(r.cashflow?.nationalPension || 0),
        Math.round(r.cashflow?.privatePension || 0),
        Math.round(r.cashflow?.additionalPension || 0),
        Math.round(r.cashflow?.withdrawalGross || 0),
        Math.round(r.cashflow?.withdrawalNet || 0),
        Math.round(r.cashflow?.taxPaid || 0),
        Math.round(r.cashflow?.totalIncomeNet || 0)
    ].join(","));

    return [headers.join(","), ...rows].join("\n");
}

function convertLedgerToCSV(ledgerTimeline: LedgerTimelineRow[]): string {
    if (!ledgerTimeline || ledgerTimeline.length === 0) {
        return "원장 데이터가 없습니다";
    }

    const headers = [
        "월",
        "나이",
        "은퇴 여부",
        "근로소득",
        "국민연금",
        "개인연금",
        "추가 연금",
        "사업소득",
        "임대소득",
        "퇴직금",
        "주택연금",
        "일회성 소득",
        "인출액(세전)",
        "총소득(세전)",
        "총 순소득",
        "필수 생활비",
        "선택 지출",
        "주거비",
        "기본 의료비",
        "의료비 쇼크",
        "생애단계 조정",
        "일회성 지출",
        "납부 세금",
        "건강보험료",
        "총지출",
        "과세소득",
        "건보 산정소득",
        "적용 세액공제",
        "과세 투자자산",
        "개인연금 잔액",
        "부동산",
        "추가 연금 잔액",
        "부채",
        "총자산",
        "총자산(실질)"
    ];

    const rows = ledgerTimeline.map((row) => [
        row.month,
        row.age.toFixed(1),
        row.isRetired ? "예" : "아니오",
        Math.round(row.incomes.salary),
        Math.round(row.incomes.nationalPension),
        Math.round(row.incomes.privatePension),
        Math.round(row.incomes.additionalPension),
        Math.round(row.incomes.businessIncome),
        Math.round(row.incomes.rentalIncome),
        Math.round(row.incomes.severance),
        Math.round(row.incomes.reverseMortgage),
        Math.round(row.incomes.oneOffIncome),
        Math.round(row.incomes.withdrawalGross),
        Math.round(row.incomes.totalGross),
        Math.round(row.incomes.totalNet),
        Math.round(row.expenses.essential),
        Math.round(row.expenses.discretionary),
        Math.round(row.expenses.housing),
        Math.round(row.expenses.medicalBaseline),
        Math.round(row.expenses.medicalShock),
        Math.round(row.expenses.stageAdjustments),
        Math.round(row.expenses.oneOffExpense),
        Math.round(row.expenses.taxPaid),
        Math.round(row.expenses.healthInsurancePremium),
        Math.round(row.expenses.total),
        Math.round(row.tax.taxableIncomeMonthly),
        Math.round(row.tax.healthInsuranceAssessableIncomeMonthly),
        Math.round(row.tax.taxCreditApplied),
        Math.round(row.balances.taxableInvestments),
        Math.round(row.balances.privatePension),
        Math.round(row.balances.realEstate),
        Math.round(row.balances.additionalPensions),
        Math.round(row.balances.debt),
        Math.round(row.balances.totalAssets),
        Math.round(row.balances.totalAssetsReal)
    ].join(","));

    return [headers.join(","), ...rows].join("\n");
}

export function exportSimulationResult(result: SimulationResult) {
    let csvContent = "";
    const representativePath = getRepresentativePath(result);
    const representativeTimeline = getRepresentativeTimeline(result);
    const representativeLedger = getRepresentativeLedgerTimeline(result);
    const samplePaths = getSampleDisplayPaths(result);
    const ledgerRetirementRows = representativeLedger.length > 0
        ? (() => {
            const rows = representativeLedger;
            const retirementStartIndex = rows.findIndex((row) => row.isRetired);
            return retirementStartIndex >= 0 ? rows.slice(retirementStartIndex, retirementStartIndex + 12) : rows.slice(0, 12);
        })()
        : [];
    const essentialCoverageRate = ledgerRetirementRows.length > 0
        ? ledgerRetirementRows.filter(
            (row) => row.incomes.totalNet >= (row.expenses.essential + row.expenses.housing + row.expenses.medicalBaseline)
        ).length / ledgerRetirementRows.length
        : null;

    // Add Summary Section at top
    csvContent += `모드,${formatResultMode(result.mode)}\n`;
    csvContent += `계산 방식,${formatCalculationMode(result.summary.calculationMode)}\n`;
    csvContent += `데이터 소스,${formatResultSource(result.summary.source)}\n`;
    csvContent += `규칙 버전,${result.summary.ruleMetadata.version}\n`;
    csvContent += `역사적 데이터 범위,${result.summary.ruleMetadata.historicalDataRange.startYear}-${result.summary.ruleMetadata.historicalDataRange.endYear}\n`;
    csvContent += `은퇴 나이,${result.summary.retireAge}\n`;
    csvContent += `성공률,${result.summary.successRate}\n`;
    csvContent += `은퇴 시 자산(실질),${Math.round(result.summary.retirementPoint.totalAssetsReal)}\n`;
    csvContent += `최종 자산(실질 P50),${Math.round(result.summary.terminalStats.totalAssetsReal.p50)}\n`;
    csvContent += `최종 자산(실질 평균),${Math.round(result.summary.finalTotalAssetsReal)}\n`;
    if (essentialCoverageRate !== null) {
        csvContent += `필수생활비 충족률,${essentialCoverageRate}\n`;
    }
    if (result.summary.assumptionWarnings.length > 0) {
        csvContent += `가정 및 경고,${result.summary.assumptionWarnings.map((warning) => warning.message).join(" | ")}\n`;
    }
    csvContent += "\n";

    if (result.mode === "deterministic") {
        csvContent += convertTimelineToCSV(representativeTimeline);
    } else {
        const distributionLabel = result.mode === "historical" ? "역사적 백테스트" : "몬테카를로";
        if (result.trajectoryStats) {
            csvContent += `\n\n=== ${distributionLabel} 경로 통계(실질 자산) ===\n`;
            csvContent += "월,P10(하위 10%),P50(중위값),P90(상위 10%)\n";

            const stats = result.trajectoryStats;
            const rows = stats.month.map((m, i) => [
                m,
                Math.round(stats.p10[i]),
                Math.round(stats.p50[i]),
                Math.round(stats.p90[i])
            ].join(","));

            csvContent += rows.join("\n");
            csvContent += `\n\n=== 대표 경로 (${representativePath?.label ?? "대표 경로"}) ===\n`;
        } else {
            csvContent += `참고: 타임라인 데이터는 ${distributionLabel} 결과의 대표 경로입니다.\n\n`;
        }

        if (representativeTimeline.length > 0) {
            csvContent += convertTimelineToCSV(representativeTimeline);
        }

        if (samplePaths.length > 0) {
            for (const sample of samplePaths) {
                csvContent += `\n\n=== ${sample.label} ===\n`;
                csvContent += convertTimelineToCSV(sample.timeline);
            }
        }
    }

    if (representativeLedger.length > 0) {
        csvContent += "\n\n=== 월별 원장 ===\n";
        csvContent += convertLedgerToCSV(representativeLedger);
    }

    // Create BOM for Excel (UTF-8)
    const BOM = "\uFEFF";
    downloadBlob(BOM + csvContent, "retirement_simulation_raw.csv", "text/csv;charset=utf-8;");
}
