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

function convertTimelineToCSV(timeline: TimelineRow[]): string {
    if (!timeline || timeline.length === 0) {
        return "No timeline data available";
    }

    const headers = [
        "Month",
        "Age",
        "Retired",
        "General Balance",
        "Private Pension Balance",
        "Real Estate",
        "Addt'l Pensions",
        "Debt",
        "Total Assets (Nominal)",
        "Total Assets (Real)",
        "National Pension (Income)",
        "Private Pension (Income)",
        "Addt'l Pension (Income)",
        "Withdrawal (Gross)",
        "Withdrawal (Net)",
        "Tax Paid",
        "Total Net Income"
    ];

    const rows = timeline.map(r => [
        r.month,
        r.age.toFixed(1),
        r.isRetired ? "Yes" : "No",
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
        return "No ledger data available";
    }

    const headers = [
        "Month",
        "Age",
        "Retired",
        "Salary",
        "National Pension",
        "Private Pension",
        "Additional Pension",
        "Business Income",
        "Rental Income",
        "Severance",
        "Reverse Mortgage",
        "One-off Income",
        "Withdrawal Gross",
        "Total Gross Income",
        "Total Net Income",
        "Essential Expense",
        "Discretionary Expense",
        "Housing Expense",
        "Medical Baseline",
        "Medical Shock",
        "Stage Adjustments",
        "One-off Expense",
        "Tax Paid",
        "Health Insurance",
        "Total Expense",
        "Taxable Income",
        "HI Assessable Income",
        "Tax Credit Applied",
        "Taxable Investments",
        "Private Pension Balance",
        "Real Estate",
        "Additional Pensions Balance",
        "Debt",
        "Total Assets",
        "Total Assets Real"
    ];

    const rows = ledgerTimeline.map((row) => [
        row.month,
        row.age.toFixed(1),
        row.isRetired ? "Yes" : "No",
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
    const ledgerRetirementRows = (result.ledgerTimeline ?? []).length > 0
        ? (() => {
            const rows = result.ledgerTimeline ?? [];
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
    csvContent += `Mode,${result.mode}\n`;
    csvContent += `Calculation Mode,${result.summary.calculationMode}\n`;
    csvContent += `Source,${result.summary.source}\n`;
    csvContent += `Rule Version,${result.summary.ruleMetadata.version}\n`;
    csvContent += `Historical Data Range,${result.summary.ruleMetadata.historicalDataRange.startYear}-${result.summary.ruleMetadata.historicalDataRange.endYear}\n`;
    csvContent += `Retire Age,${result.summary.retireAge}\n`;
    csvContent += `Success Rate,${result.summary.successRate}\n`;
    csvContent += `Retirement Assets (Real),${Math.round(result.summary.retirementPoint.totalAssetsReal)}\n`;
    csvContent += `Final Assets (Real P50),${Math.round(result.summary.terminalStats.totalAssetsReal.p50)}\n`;
    csvContent += `Final Assets (Mean Real),${Math.round(result.summary.finalTotalAssetsReal)}\n`;
    if (essentialCoverageRate !== null) {
        csvContent += `Essential Spending Coverage Rate,${essentialCoverageRate}\n`;
    }
    if (result.summary.assumptionWarnings.length > 0) {
        csvContent += `Assumptions,${result.summary.assumptionWarnings.map((warning) => warning.message).join(" | ")}\n`;
    }
    csvContent += "\n";

    if (result.mode === "deterministic") {
        csvContent += convertTimelineToCSV(result.timeline);
    } else {
        const distributionLabel = result.mode === "historical" ? "Historical Backtest" : "Monte Carlo";
        if (result.trajectoryStats) {
            csvContent += `\n\n=== ${distributionLabel} Trajectory Statistics (Real Assets) ===\n`;
            csvContent += "Month,P10 (Worst 10%),P50 (Median),P90 (Best 10%)\n";

            const stats = result.trajectoryStats;
            const rows = stats.month.map((m, i) => [
                m,
                Math.round(stats.p10[i]),
                Math.round(stats.p50[i]),
                Math.round(stats.p90[i])
            ].join(","));

            csvContent += rows.join("\n");
            csvContent += "\n\n=== Sample Path Details (Path #1) ===\n";
        } else {
            csvContent += `Note: Timeline data is from the first sample path of the ${distributionLabel} result.\n\n`;
        }

        // We assume sampleTimelines[0] exists
        if (result.sampleTimelines && result.sampleTimelines.length > 0) {
            csvContent += convertTimelineToCSV(result.sampleTimelines[0]);
        }
    }

    if (result.ledgerTimeline && result.ledgerTimeline.length > 0) {
        csvContent += "\n\n=== Ledger Timeline ===\n";
        csvContent += convertLedgerToCSV(result.ledgerTimeline);
    }

    // Create BOM for Excel (UTF-8)
    const BOM = "\uFEFF";
    downloadBlob(BOM + csvContent, "retirement_simulation_raw.csv", "text/csv;charset=utf-8;");
}
