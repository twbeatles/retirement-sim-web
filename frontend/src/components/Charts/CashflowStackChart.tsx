import React from "react";
import {
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
    Legend
} from "recharts";
import type { TimelineRow } from "../../logic/types";

function fmt(n: number) {
    if (!isFinite(n)) return "-";
    return Math.round(n / 10000).toLocaleString() + "만";
}

export const CashflowStackChart = React.memo(function CashflowStackChart({ data }: { data: TimelineRow[] }) {
    const samplingRate = 12; // Yearly view is better for cashflow

    const chartData = React.useMemo(() => {
        return data.filter((_, i) => i % samplingRate === 0).map(row => {
            const cashflow = row.cashflow;
            // Income Sources
            const national = cashflow.nationalPension || 0;
            const privateP = cashflow.privatePension || 0;
            const additionalP = cashflow.additionalPension || 0;
            const withdraw = cashflow.withdrawalNet || 0;
            const other = (cashflow.totalIncomeNet || 0) - national - privateP - additionalP - withdraw;

            return {
                month: row.month,
                year: Math.floor(row.month / 12),
                national,
                privateP,
                additionalP,
                withdraw,
                other: other > 0 ? other : 0,
                totalIncome: cashflow.totalIncomeNet,
            };
        });
    }, [data]);

    return (
        <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
                <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" tickFormatter={(y) => y + "년"} />
                    <YAxis tickFormatter={fmt} width={60} />
                    <Tooltip formatter={(v: any) => Math.round(Number(v) / 10000).toLocaleString() + "만원"} />
                    <Legend />

                    <Area type="monotone" dataKey="national" stackId="1" stroke="#ffc658" fill="#ffc658" name="국민연금" />
                    <Area type="monotone" dataKey="privateP" stackId="1" stroke="#8884d8" fill="#8884d8" name="개인연금" />
                    <Area type="monotone" dataKey="additionalP" stackId="1" stroke="#a855f7" fill="#a855f7" name="추가연금" />
                    <Area type="monotone" dataKey="withdraw" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="자산인출" />
                    <Area type="monotone" dataKey="other" stackId="1" stroke="#ff8042" fill="#ff8042" name="기타소득" />

                    <Line type="monotone" dataKey="totalIncome" stroke="#333" strokeWidth={2} dot={false} name="총 가처분소득" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
});
