import { SimulationResult, TimelineRow } from "./types";

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

export function exportSimulationResult(result: SimulationResult) {
    let csvContent = "";

    // Add Summary Section at top
    csvContent += `Mode,${result.mode}\n`;
    csvContent += `Retire Age,${result.summary.retireAge}\n`;
    csvContent += `Success Rate,${result.summary.successRate}\n`;
    csvContent += `Final Assets (Mean Real),${Math.round(result.summary.finalTotalAssetsReal)}\n`;
    csvContent += "\n";

    if (result.mode === "deterministic") {
        csvContent += convertTimelineToCSV(result.timeline);
    } else {
        // For MC, usually we export the "Mean" path or "Summary" path?
        // Or just the first path as sample?
        // Let's export the first path timeline for detailed view.
        if (result.trajectoryStats) {
            csvContent += "\n\n=== Monte Carlo Trajectory Statistics (Real Assets) ===\n";
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
            csvContent += "Note: Timeline data is from the first sample path of the Monte Carlo simulation.\n\n";
        }

        // We assume sampleTimelines[0] exists
        if (result.sampleTimelines && result.sampleTimelines.length > 0) {
            csvContent += convertTimelineToCSV(result.sampleTimelines[0]);
        }
    }

    // Create BOM for Excel (UTF-8)
    const BOM = "\uFEFF";
    downloadBlob(BOM + csvContent, "retirement_simulation_result.csv", "text/csv;charset=utf-8;");
}
