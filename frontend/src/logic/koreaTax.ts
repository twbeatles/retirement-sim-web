/**
 * Korean Health Insurance Calculator (2024 Standards)
 * Focuses on 'Regional Subscribers' (지역가입자) which most retirees fall into.
 */

// 2024 Point Value
const POINT_VALUE = 208.4; // KRW per point

/**
 * Calculate Monthly Premium for Regional Subscriber
 * @param annualIncome (KRW) - Total annual income (Pension + Interest + Dividend + Etc)
 * @param propertyValue (KRW) - Taxable basis (Property Tax Basis, not Market Value). Usually 60-70% of Market Value.
 * @param carValue (KRW) - Value of vehicle (only roughly considered for cars > 40M KRW in new system)
 * @returns Monthly Premium (KRW)
 */
export function calculateRegionalHealthInsurance(
    annualIncome: number,
    propertyValue: number = 0,
    carValue: number = 0
): number {
    // 1. Income Premium (소득 정률제)
    // 2024: (Annual Income * 7.09%) / 12
    // Minimum Annual Income considered: 3.36M KRW

    // Determine Income Score or Rate
    // Since 2022 (Stage 2), it's mostly flat rate for income.
    const incomeRate = 0.0709; // 7.09%

    let monthlyIncomePremium = 0;

    // Logic:
    // If annual income > 3.36M: Income * 7.09% / 12
    // If annual income <= 3.36M: Minimum premium applies (handled by Minimum Score usually, but simplified here)

    // Accurate logic for 2024:
    // A. Income Premium
    if (annualIncome > 3360000) {
        monthlyIncomePremium = (annualIncome * incomeRate) / 12;
    } else {
        // Minimum premium logic is complex, usually base score.
        // We will assume a base floor later.
        monthlyIncomePremium = 0;
    }

    // 2. Property Premium (재산 등급별 점수제)
    // Property Tax Base = Market Value * Fair Market Ratio (60% for House)
    // Basic Deduction: 50M KRW (general) -> Expanded to 100M? No, 50M basic.
    // Logic: (Property - Deduction) -> Grade -> Score -> Premium

    const basicDeduction = 50000000; // 50 Million Won
    const taxableProperty = Math.max(0, propertyValue - basicDeduction);

    let propertyScore = 0;

    // Simplified Bracket for Points (approximate quadratic fit or look-up table)
    // 60 Grades... We will use a simplified formula approximation.
    // Grade 1 (<= 4.5M): 22 pts
    // ...
    // Grade 60 (> 7781M): 2341 pts
    // Linear approximation for typical range (100M ~ 3000M)
    // Approx: 0.0003 points per 10k KRW?
    // Let's use a widely used approximation function or simplified table.

    if (taxableProperty > 0) {
        // Piecewise linear approximation based on the exact 60-grade table (2024 National Health Insurance)
        const tp = taxableProperty;
        if (tp <= 4500000) propertyScore = 22;
        else if (tp <= 9000000) propertyScore = 32;
        else if (tp <= 13500000) propertyScore = 43;
        else if (tp <= 50000000) propertyScore = 43 + ((tp - 13500000) / 36500000) * (147 - 43);
        else if (tp <= 100000000) propertyScore = 147 + ((tp - 50000000) / 50000000) * (262 - 147);
        else if (tp <= 200000000) propertyScore = 262 + ((tp - 100000000) / 100000000) * (433 - 262);
        else if (tp <= 500000000) propertyScore = 433 + ((tp - 200000000) / 300000000) * (741 - 433);
        else if (tp <= 1000000000) propertyScore = 741 + ((tp - 500000000) / 500000000) * (1081 - 741);
        else if (tp <= 3000000000) propertyScore = 1081 + ((tp - 1000000000) / 2000000000) * (1821 - 1081);
        else if (tp <= 7781240000) propertyScore = 1821 + ((tp - 3000000000) / 4781240000) * (2341 - 1821);
        else propertyScore = 2341;

        propertyScore = Math.floor(propertyScore);
    }

    // 3. Car Premium (자동차 점수)
    // Only applies if car value > 40M KRW
    let carScore = 0;
    if (carValue >= 40000000) {
        // Simplified
        carScore = Math.floor(carValue / 3000000); // Rough
    }

    // Calculate Property + Car Premium
    const propertyPremium = (propertyScore + carScore) * POINT_VALUE;

    // Total Health Premium
    let healthPremium = monthlyIncomePremium + propertyPremium;

    // Minimum Floor (2024): 19,780 KRW
    const minPremium = 19780;
    healthPremium = Math.max(minPremium, healthPremium);

    // Maximum Ceiling (2024): ~4M KRW
    healthPremium = Math.min(4240000, healthPremium);

    // 4. Long-term Care Insurance (장기요양보험료)
    // 2024 Rate: 12.95% of Health Premium
    const longTermCareRate = 0.1295;
    const totalPremium = healthPremium * (1 + longTermCareRate);

    // Truncate to 10 won
    return Math.floor(totalPremium / 10) * 10;
}
