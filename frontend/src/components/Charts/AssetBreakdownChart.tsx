import React from "react";
import {
    AreaChart,
    Area,
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

function fmtFull(n: number) {
    if (!isFinite(n)) return "-";
    return Math.round(n / 10000).toLocaleString() + "만원";
}

export const AssetBreakdownChart = React.memo(function AssetBreakdownChart({ data }: { data: TimelineRow[] }) {
    const samplingRate = data.length > 200 ? 6 : 1;

    const chartData = React.useMemo(() => {
        return data.filter((_, i) => i % samplingRate === 0).map(row => {
            const general = row.general || 0;
            const privatePension = row.privatePension || 0;
            const debt = row.debt || 0;
            // Use new TimelineRow fields directly
            const realEstate = row.realEstate || 0;
            const additionalPension = row.additionalPension || 0;

            return {
                month: row.month,
                year: Math.floor(row.month / 12),
                general,
                privatePension,
                realEstate,
                additionalPension,
                debt: -debt
            };
        });
    }, [data, samplingRate]);

    return (
        <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
                <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" tickFormatter={(y) => y + "년"} />
                    <YAxis tickFormatter={fmt} width={60} />
                    <Tooltip formatter={(v: any) => fmtFull(Number(v))} />
                    <Legend />
                    <Area type="monotone" dataKey="realEstate" stackId="1" stroke="#ffc658" fill="#ffc658" name="부동산" />
                    <Area type="monotone" dataKey="additionalPension" stackId="1" stroke="#ff8042" fill="#ff8042" name="추가연금" />
                    <Area type="monotone" dataKey="privatePension" stackId="1" stroke="#8884d8" fill="#8884d8" name="개인연금" />
                    <Area type="monotone" dataKey="general" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="금융자산(일반)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
});
