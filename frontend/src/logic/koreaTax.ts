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
        // Very rough approximation of the 60 grades
        if (taxableProperty < 13500000) propertyScore = 22;
        else {
            // Approx: val / 1,000,000 * 1.1 ? 
            // Let's use a step function for key points
            if (taxableProperty < 100000000) propertyScore = 150; // 100~200 points
            else if (taxableProperty < 300000000) propertyScore = 300;
            else if (taxableProperty < 500000000) propertyScore = 500;
            else if (taxableProperty < 900000000) propertyScore = 700;
            else propertyScore = 900 + Math.floor((taxableProperty - 900000000) / 10000000) * 2;

            // Refinement: (Property / 10,000) * factor
            // For 500M Property: ~540 points.
            // For 1B Property: ~900 points.
            propertyScore = Math.min(2341, Math.round(taxableProperty / 1000000));
        }
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
