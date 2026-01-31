import { describe, it, expect } from 'vitest';
import { annualToMonthlyReturns } from './historicalData';

describe('annualToMonthlyReturns', () => {
    it('should preserve total annual return exactly in deterministic mode', () => {
        const annualReturns = [0.10, -0.05, 0.20]; // 10%, -5%, 20%
        const monthly = annualToMonthlyReturns(annualReturns, false);

        expect(monthly.length).toBe(36);

        // Verify Year 1: 10%
        let compounded = 1.0;
        for (let i = 0; i < 12; i++) {
            compounded *= (1 + monthly[i]);
        }
        expect(compounded).toBeCloseTo(1.10, 6);

        // Verify Year 2: -5%
        compounded = 1.0;
        for (let i = 12; i < 24; i++) {
            compounded *= (1 + monthly[i]);
        }
        expect(compounded).toBeCloseTo(0.95, 6);
    });

    it('should preserve total annual return exactly in stochastic mode', () => {
        const annualReturns = [0.12]; // 12%
        // Run multiple times to check randomness stability
        for (let run = 0; run < 5; run++) {
            const monthly = annualToMonthlyReturns(annualReturns, true);

            expect(monthly.length).toBe(12);

            // Check if there is variation
            const firstVal = monthly[0];
            const allSame = monthly.every(m => m === firstVal);
            expect(allSame).toBe(false); // Should have variation

            // Check total compounding
            let compounded = 1.0;
            for (let i = 0; i < 12; i++) {
                compounded *= (1 + monthly[i]);
            }
            expect(compounded).toBeCloseTo(1.12, 6); // Must perfectly match 1.12
        }
    });
});
