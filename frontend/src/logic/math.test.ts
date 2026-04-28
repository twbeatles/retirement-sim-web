import { describe, it, expect } from 'vitest';
import { monthlyRateFromAnnual, annuityPayment, mean, percentile } from './math';

describe('Math Utils', () => {
    describe('monthlyRateFromAnnual', () => {
        it('calculates correctly', () => {
            // 12% annual -> approx 0.95% monthly (compound)
            const annual = 0.12;
            const monthly = monthlyRateFromAnnual(annual);
            expect(monthly).toBeCloseTo(0.0094888, 5);

            // (1 + m)^12 = 1 + a
            expect(Math.pow(1 + monthly, 12)).toBeCloseTo(1 + annual);
        });

        it('handles zero', () => {
            expect(monthlyRateFromAnnual(0)).toBe(0);
        });

        it('rejects invalid annual rates', () => {
            expect(() => monthlyRateFromAnnual(-1)).toThrow();
            expect(() => monthlyRateFromAnnual(Number.NaN)).toThrow();
        });
    });

    describe('annuityPayment', () => {
        it('calculates standard mortgage style payment', () => {
            // PV = 10000, r = 5% (annual), n = 10 years
            const pv = 10000;
            const r = 0.05;
            const years = 10;
            const pmt = annuityPayment(pv, r, years);

            // Expected: ~105.52 (since it uses monthly compound interpolation, not annual/12)
            expect(pmt).toBeCloseTo(105.5235, 3);
        });

        it('handles zero interest', () => {
            const pv = 12000;
            const r = 0;
            const years = 1;
            const pmt = annuityPayment(pv, r, years);
            expect(pmt).toBe(1000); // 12000 / 12
        });
    });

    describe('Statistics', () => {
        const data = [1, 2, 3, 4, 5];

        it('calculates mean', () => {
            expect(mean(data)).toBe(3);
        });

        it('calculates percentile', () => {
            expect(percentile(data, 50)).toBe(3);
            expect(percentile(data, 0)).toBe(1);
            expect(percentile(data, 100)).toBe(5);
        });
    });
});
