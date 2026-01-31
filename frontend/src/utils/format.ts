export function formatMoney(value: number): string {
    if (value >= 100000000) {
        return (value / 100000000).toFixed(1) + '억원';
    }
    return Math.round(value / 10000).toLocaleString() + '만원';
}

export function num(v: string) {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
}
