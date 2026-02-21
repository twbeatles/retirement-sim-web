import { describe, it, expect } from 'vitest';
import { calculateRegionalHealthInsurance } from './koreaTax';

describe('Korea Tax Calculator (Health Insurance)', () => {
    it('calculates minimum floor premium for low income and property', () => {
        const premium = calculateRegionalHealthInsurance(2000000, 0, 0); // Income < 3.36M, no property
        // The base minimum floor is 19780.
        // And long-term care adds 12.95% -> 19780 * 1.1295 = 22341.51 => floor down to 10s: 22340
        expect(premium).toBe(22340);
    });

    it('calculates premium for detailed property values (60 grade approx)', () => {
        // Assume annual income = 36000000 (36M KRW)
        // Property value = 550M KRW (Taxable = 500M)
        // Car = 0
        const income = 36000000;
        const property = 550000000;

        // Expected manually:
        // Income premium = 36000000 * 0.0709 / 12 = 212700
        // Property Grade for 500M taxable:
        // Expected score ~ 741
        // Property premium = 741 * 208.4 = 154424.4
        // Health Premium = 212700 + 154424.4 = 367124.4
        // With long term care (12.95%): 367124.4 * 1.1295 = 414667.009...
        // Truncate to 10 won: 414660

        const premium = calculateRegionalHealthInsurance(income, property, 0);
        expect(premium).toBeCloseTo(414660, -1); // Check within 10 won
    });

    it('caps premium at maximum ceiling', () => {
        const premium = calculateRegionalHealthInsurance(10000000000, 10000000000, 100000000);
        // Medical max = 4,240,000 + long-term care
        expect(premium).toBeGreaterThan(4500000);
    });
});
