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
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700 mt-6 shadow-sm">
            <table className="w-full text-sm text-right border-collapse whitespace-nowrap">
                <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-zinc-700">
                        <th className="p-3 text-center sm:text-right font-semibold text-xs uppercase tracking-wider">나이</th>
                        <th className="p-3 text-center sm:text-right font-semibold text-xs uppercase tracking-wider">상태</th>
                        <th className="p-3 text-center sm:text-right font-semibold text-xs uppercase tracking-wider">총자산(물가반영)</th>
                        <th className="p-3 text-center sm:text-right font-semibold text-xs uppercase tracking-wider">국민연금(연)</th>
                        <th className="p-3 text-center sm:text-right font-semibold text-xs uppercase tracking-wider">개인연금(연)</th>
                        <th className="p-3 text-center sm:text-right font-semibold text-xs uppercase tracking-wider">자산인출(세후)</th>
                        <th className="p-3 text-center sm:text-right font-semibold text-xs uppercase tracking-wider">세금</th>
                        <th className="p-3 text-center sm:text-right font-semibold text-xs uppercase tracking-wider">총 가처분소득(연)</th>
                        <th className="p-3 text-center sm:text-right font-semibold text-xs uppercase tracking-wider">월 평균소득</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-slate-100 dark:divide-zinc-800">
                    {years.map((row) => (
                        <tr key={row.year} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group">
                            <td className="p-3 text-center sm:text-right font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">{row.age}세</td>
                            <td className="p-3 text-center sm:text-right">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${row.isRetired ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'}`}>
                                    {row.isRetired ? "은퇴" : "근로"}
                                </span>
                            </td>
                            <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/10 group-hover:bg-indigo-50/40 dark:group-hover:bg-indigo-900/20">{fmt(row.totalAssetsReal)}</td>
                            <td className="p-3 font-medium text-slate-600 dark:text-slate-400">{fmt(row.natPension)}</td>
                            <td className="p-3 font-medium text-slate-600 dark:text-slate-400">{fmt(row.privPension)}</td>
                            <td className="p-3 font-medium text-slate-600 dark:text-slate-400">{fmt(row.withdrawalNet)}</td>
                            <td className="p-3 font-semibold text-red-500 dark:text-red-400">{fmt(row.taxPaid)}</td>
                            <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-900/10 group-hover:bg-emerald-50/40 dark:group-hover:bg-emerald-900/20">{fmt(row.totalNetIncome)}</td>
                            <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{fmt(row.totalNetIncome / 12)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
