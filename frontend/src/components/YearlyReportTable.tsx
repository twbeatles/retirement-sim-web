import React from "react";
import { TimelineRow } from "../logic/types";

function fmt(n: number) {
    if (!isFinite(n)) return "-";
    return Math.round(n).toLocaleString();
}

export function YearlyReportTable({ data }: { data: TimelineRow[] }) {
    // Aggregate by Year (taking the value at the END of each year, or sum of flows)
    // For balances: End of Year
    // For flows: Sum of Year

    // Data is monthly.
    // Group by Math.floor(m / 12)

    const years = React.useMemo(() => {
        const map = new Map<number, {
            age: number,
            isRetired: boolean,
            rows: TimelineRow[]
        }>();

        data.forEach(r => {
            const y = Math.floor(r.month / 12);
            if (!map.has(y)) {
                map.set(y, { age: Math.floor(r.age), isRetired: r.isRetired, rows: [] });
            }
            map.get(y)?.rows.push(r);
        });

        const res = [];
        // Convert map to array
        const sortedYears = Array.from(map.keys()).sort((a, b) => a - b);

        for (const y of sortedYears) {
            const group = map.get(y)!;
            const lastRow = group.rows[group.rows.length - 1];

            // Sum flows
            let sumNat = 0, sumPriv = 0, sumWithdraw = 0, sumTax = 0, sumNet = 0;
            group.rows.forEach(r => {
                sumNat += r.cashflow.nationalPension;
                sumPriv += r.cashflow.privatePension;
                sumWithdraw += r.cashflow.withdrawalNet;
                sumTax += r.cashflow.taxPaid;
                sumNet += r.cashflow.totalIncomeNet;
            });

            res.push({
                year: y, // 0-based year index (years since start)
                age: group.age,
                isRetired: group.isRetired,

                // Balances (End of Year)
                totalAssets: lastRow.totalAssets,
                totalAssetsReal: lastRow.totalAssetsReal,

                // Annual Flows
                natPension: sumNat,
                privPension: sumPriv,
                withdrawalNet: sumWithdraw,
                taxPaid: sumTax,
                totalNetIncome: sumNet
            });
        }
        return res;
    }, [data]);

    if (!data || data.length === 0) return null;

    return (
        <div className="table-container yearly-report-table">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>나이</th>
                        <th>상태</th>
                        <th>총자산(물가반영)</th>
                        <th>국민연금(연)</th>
                        <th>개인연금(연)</th>
                        <th>자산인출(세후)</th>
                        <th>세금</th>
                        <th>총 가처분소득(연)</th>
                        <th>월 평균소득</th>
                    </tr>
                </thead>
                <tbody>
                    {years.map((row) => (
                        <tr key={row.year}>
                            <td>{row.age}세</td>
                            <td>{row.isRetired ? "은퇴" : "근로"}</td>
                            <td className="yearly-asset-cell">{fmt(row.totalAssetsReal)}</td>
                            <td>{fmt(row.natPension)}</td>
                            <td>{fmt(row.privPension)}</td>
                            <td>{fmt(row.withdrawalNet)}</td>
                            <td className="yearly-tax-cell">{fmt(row.taxPaid)}</td>
                            <td className="yearly-income-cell">{fmt(row.totalNetIncome)}</td>
                            <td>{fmt(row.totalNetIncome / 12)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
