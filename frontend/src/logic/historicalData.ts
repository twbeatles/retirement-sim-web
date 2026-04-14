/**
 * Historical Market Data Module
 * Contains historical annual returns and inflation data for backtesting
 * Data period: 1985-2024 (40 years)
 */

// Historical Annual Returns (1985-2024)
// Sources: Bloomberg, FRED, KRX, Yahoo Finance

export const HISTORICAL_YEARS = [
    1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994,
    1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004,
    2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014,
    2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024
];

export const HISTORICAL_DATA_START_YEAR = HISTORICAL_YEARS[0];
export const HISTORICAL_DATA_END_YEAR = HISTORICAL_YEARS[HISTORICAL_YEARS.length - 1];

// S&P 500 Total Return (including dividends)
export const SP500_RETURNS = [
    0.3216, 0.1867, 0.0525, 0.1661, 0.3169, // 1985-1989
    -0.0310, 0.3047, 0.0762, 0.1008, 0.0132, // 1990-1994
    0.3758, 0.2296, 0.3336, 0.2858, 0.2104, // 1995-1999
    -0.0910, -0.1189, -0.2210, 0.2869, 0.1088, // 2000-2004
    0.0491, 0.1579, 0.0549, -0.3700, 0.2646, // 2005-2009
    0.1506, 0.0211, 0.1600, 0.3239, 0.1369, // 2010-2014
    0.0138, 0.1196, 0.2183, -0.0438, 0.3149, // 2015-2019
    0.1840, 0.2871, -0.1811, 0.2629, 0.2500  // 2020-2024
];

// MSCI World (Global Stocks)
export const MSCI_WORLD_RETURNS = [
    0.4070, 0.4180, 0.1610, 0.2350, 0.1680, // 1985-1989
    -0.1720, 0.1869, 0.0494, 0.2261, 0.0531, // 1990-1994
    0.2078, 0.1348, 0.1581, 0.2447, 0.2493, // 1995-1999
    -0.1321, -0.1662, -0.1994, 0.3310, 0.1449, // 2000-2004
    0.0949, 0.2007, 0.0907, -0.4071, 0.2978, // 2005-2009
    0.1159, -0.0573, 0.1573, 0.2663, 0.0487, // 2010-2014
    -0.0087, 0.0751, 0.2240, -0.0884, 0.2780, // 2015-2019
    0.1588, 0.2182, -0.1805, 0.2381, 0.1900  // 2020-2024
];

// US Aggregate Bond Index
export const US_BOND_RETURNS = [
    0.2213, 0.1526, 0.0278, 0.0789, 0.1454, // 1985-1989
    0.0896, 0.1600, 0.0740, 0.0983, -0.0292, // 1990-1994
    0.1847, 0.0363, 0.0965, 0.0869, -0.0082, // 1995-1999
    0.1163, 0.0844, 0.1026, 0.0410, 0.0434, // 2000-2004
    0.0243, 0.0433, 0.0697, 0.0524, 0.0593, // 2005-2009
    0.0654, 0.0784, 0.0421, -0.0202, 0.0597, // 2010-2014
    0.0055, 0.0265, 0.0354, 0.0001, 0.0872, // 2015-2019
    0.0751, -0.0154, -0.1306, 0.0565, 0.0110  // 2020-2024
];

// KOSPI Index (Korea)
export const KOSPI_RETURNS = [
    0.0523, 0.6786, 0.9550, 0.7050, 0.0097, // 1985-1989
    -0.2380, -0.1290, 0.1050, 0.2870, 0.1850, // 1990-1994
    -0.1390, -0.2590, -0.4230, 0.4960, 0.8290, // 1995-1999
    -0.5090, 0.3700, -0.0950, 0.2940, 0.1050, // 2000-2004
    0.5400, 0.0400, 0.3220, -0.4060, 0.4970, // 2005-2009
    0.2190, -0.1100, 0.0900, 0.0070, -0.0470, // 2010-2014
    0.0240, 0.0320, 0.2190, -0.1710, 0.0780, // 2015-2019
    0.3070, 0.0360, -0.2450, 0.1870, -0.0970  // 2020-2024
];

// Cash / T-Bill Returns
export const CASH_RETURNS = [
    0.0772, 0.0616, 0.0583, 0.0635, 0.0837, // 1985-1989
    0.0781, 0.0560, 0.0351, 0.0286, 0.0399, // 1990-1994
    0.0560, 0.0521, 0.0526, 0.0486, 0.0480, // 1995-1999
    0.0598, 0.0362, 0.0165, 0.0103, 0.0138, // 2000-2004
    0.0303, 0.0480, 0.0466, 0.0160, 0.0015, // 2005-2009
    0.0013, 0.0003, 0.0007, 0.0005, 0.0003, // 2010-2014
    0.0005, 0.0033, 0.0093, 0.0194, 0.0212, // 2015-2019
    0.0036, 0.0005, 0.0199, 0.0520, 0.0520  // 2020-2024
];

// Global REIT Returns (FTSE NAREIT)
export const REIT_RETURNS = [
    0.1910, 0.1912, -0.0370, 0.1340, 0.0870, // 1985-1989
    -0.1540, 0.3570, 0.1440, 0.1920, 0.0310, // 1990-1994
    0.1520, 0.3530, 0.2020, -0.1820, -0.0460, // 1995-1999
    0.2660, 0.1370, 0.0360, 0.3710, 0.3130, // 2000-2004
    0.1210, 0.3510, -0.1590, -0.3780, 0.2790, // 2005-2009
    0.2778, 0.0829, 0.1997, 0.0247, 0.2782, // 2010-2014
    0.0280, 0.0882, 0.0527, -0.0418, 0.2561, // 2015-2019
    -0.0533, 0.3930, -0.2507, 0.1170, 0.0500  // 2020-2024
];

// Historical Inflation Rates
export const US_INFLATION = [
    0.0355, 0.0191, 0.0436, 0.0406, 0.0480, // 1985-1989
    0.0610, 0.0306, 0.0290, 0.0275, 0.0267, // 1990-1994
    0.0254, 0.0333, 0.0170, 0.0155, 0.0268, // 1995-1999
    0.0339, 0.0155, 0.0238, 0.0188, 0.0326, // 2000-2004
    0.0342, 0.0254, 0.0408, 0.0009, 0.0272, // 2005-2009
    0.0150, 0.0296, 0.0174, 0.0150, 0.0076, // 2010-2014
    0.0073, 0.0212, 0.0211, 0.0193, 0.0230, // 2015-2019
    0.0123, 0.0700, 0.0650, 0.0340, 0.0290  // 2020-2024
];

export const KOREA_INFLATION = [
    0.0250, 0.0280, 0.0310, 0.0720, 0.0570, // 1985-1989
    0.0850, 0.0930, 0.0630, 0.0480, 0.0620, // 1990-1994
    0.0450, 0.0490, 0.0440, 0.0750, 0.0080, // 1995-1999
    0.0230, 0.0410, 0.0280, 0.0350, 0.0360, // 2000-2004
    0.0280, 0.0220, 0.0250, 0.0470, 0.0290, // 2005-2009
    0.0290, 0.0400, 0.0220, 0.0130, 0.0130, // 2010-2014
    0.0070, 0.0100, 0.0190, 0.0150, 0.0040, // 2015-2019
    0.0050, 0.0250, 0.0510, 0.0360, 0.0200  // 2020-2024
];

// Asset type to historical data mapping
export type HistoricalAssetType =
    | 'us_stock'
    | 'global_stock'
    | 'us_bond'
    | 'korea_stock'
    | 'cash'
    | 'reit';

export const HISTORICAL_RETURNS_MAP: Record<HistoricalAssetType, number[]> = {
    us_stock: SP500_RETURNS,
    global_stock: MSCI_WORLD_RETURNS,
    us_bond: US_BOND_RETURNS,
    korea_stock: KOSPI_RETURNS,
    cash: CASH_RETURNS,
    reit: REIT_RETURNS
};

export function getHistoricalYearRange() {
    return {
        startYear: HISTORICAL_DATA_START_YEAR,
        endYear: HISTORICAL_DATA_END_YEAR
    };
}

export function clampHistoricalStartYear(startYear?: number): number {
    if (!Number.isFinite(startYear)) {
        return HISTORICAL_DATA_START_YEAR;
    }

    return Math.max(
        HISTORICAL_DATA_START_YEAR,
        Math.min(HISTORICAL_DATA_END_YEAR, Math.floor(startYear as number))
    );
}

export function getAvailableHistoricalScenarioCount(startYear?: number): number {
    const clampedStartYear = clampHistoricalStartYear(startYear);
    const startIndex = HISTORICAL_YEARS.indexOf(clampedStartYear);

    if (startIndex < 0) {
        return HISTORICAL_YEARS.length;
    }

    return Math.max(1, HISTORICAL_YEARS.length - startIndex);
}

/**
 * Get historical returns for a given asset type and year range
 */
export function getHistoricalReturns(
    assetType: HistoricalAssetType,
    startYear: number,
    years: number
): number[] {
    const data = HISTORICAL_RETURNS_MAP[assetType];
    const startIndex = HISTORICAL_YEARS.indexOf(startYear);

    if (startIndex === -1) {
        console.warn(`Start year ${startYear} not found in historical data`);
        return [];
    }

    const result: number[] = [];
    for (let i = 0; i < years; i++) {
        const index = (startIndex + i) % data.length; // Wrap around for longer simulations
        result.push(data[index]);
    }

    return result;
}

/**
 * Get historical inflation for a given country and year range
 */
export function getHistoricalInflation(
    country: 'us' | 'korea',
    startYear: number,
    years: number
): number[] {
    const data = country === 'us' ? US_INFLATION : KOREA_INFLATION;
    const startIndex = HISTORICAL_YEARS.indexOf(startYear);

    if (startIndex === -1) {
        console.warn(`Start year ${startYear} not found in historical data`);
        return [];
    }

    const result: number[] = [];
    for (let i = 0; i < years; i++) {
        const index = (startIndex + i) % data.length;
        result.push(data[index]);
    }

    return result;
}

/**
 * Map portfolio asset class to historical asset type
 */
export function mapAssetClassToHistorical(assetName: string): HistoricalAssetType {
    const nameL = assetName.toLowerCase();

    if (nameL.includes('미국') || nameL.includes('s&p') || nameL.includes('us stock')) {
        return 'us_stock';
    }
    if (nameL.includes('코스피') || nameL.includes('kospi') || nameL.includes('한국')) {
        return 'korea_stock';
    }
    if (nameL.includes('채권') || nameL.includes('bond')) {
        return 'us_bond';
    }
    if (nameL.includes('리츠') || nameL.includes('reit') || nameL.includes('부동산')) {
        return 'reit';
    }
    if (nameL.includes('현금') || nameL.includes('cash') || nameL.includes('예금')) {
        return 'cash';
    }

    // Default to global stocks
    return 'global_stock';
}

/**
 * Convert annual returns to monthly returns array
 * Simple: divide annual by 12 and spread
 * Stochastic: randomize within the year
 */
export function annualToMonthlyReturns(
    annualReturns: number[],
    stochastic: boolean = false
): number[] {
    const monthly: number[] = [];

    for (const annualReturn of annualReturns) {
        // Convert annual to monthly compound rate
        const monthlyRate = Math.pow(1 + annualReturn, 1 / 12) - 1;

        if (stochastic) {
            // Add some monthly variation while maintaining annual total
            // This simulates intra-year volatility
            // FIX: Use geometric product to ensure exact compounding match
            const monthlyReturns: number[] = [];
            let currentProduct = 1.0;
            const targetProduct = 1.0 + annualReturn;

            for (let m = 0; m < 11; m++) {
                // Random variation around monthly rate
                const variation = (Math.random() - 0.5) * 0.04; // ±2% variation

                // Ensure the return doesn't go below -100% (unlikely with this variation but safe)
                // and try to keep it reasonable.
                // We centre the random walk around the 'monthlyRate'.
                const monthReturn = monthlyRate + variation;

                monthlyReturns.push(monthReturn);
                currentProduct *= (1.0 + monthReturn);
            }

            // Last month ensures we hit the target exact annual return
            // target = current * (1 + last)
            // (1 + last) = target / current
            // last = (target / current) - 1
            const lastMonthReturn = (targetProduct / currentProduct) - 1.0;
            monthlyReturns.push(lastMonthReturn);

            monthly.push(...monthlyReturns);
        } else {
            // Deterministic: same monthly rate
            for (let m = 0; m < 12; m++) {
                monthly.push(monthlyRate);
            }
        }
    }

    return monthly;
}

