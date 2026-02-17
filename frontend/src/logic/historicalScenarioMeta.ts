export interface HistoricalScenario {
    id: string;
    name: string;
    nameKo: string;
    startYear: number;
    description: string;
    descriptionKo: string;
}

export const HISTORICAL_YEAR_MIN = 1985;
export const HISTORICAL_YEAR_MAX = 2020;

export const HISTORICAL_SCENARIOS: HistoricalScenario[] = [
    {
        id: "dot_com_crash",
        name: "Dot-com Crash (2000)",
        nameKo: "닷컴 버블 붕괴 (2000)",
        startYear: 1998,
        description: "Tech bubble burst, 3 years of negative returns",
        descriptionKo: "기술주 버블 붕괴, 3년 연속 마이너스 수익률"
    },
    {
        id: "great_recession",
        name: "Great Recession (2008)",
        nameKo: "글로벌 금융위기 (2008)",
        startYear: 2006,
        description: "Housing crisis and global financial meltdown",
        descriptionKo: "주택시장 붕괴와 글로벌 금융 위기"
    },
    {
        id: "covid_crash",
        name: "COVID-19 Crash (2020)",
        nameKo: "코로나 충격 (2020)",
        startYear: 2018,
        description: "Pandemic-induced market crash and recovery",
        descriptionKo: "팬데믹으로 인한 시장 충격과 회복"
    },
    {
        id: "bull_market_90s",
        name: "Bull Market (1995-1999)",
        nameKo: "90년대 강세장 (1995-1999)",
        startYear: 1993,
        description: "Strong economic growth and tech boom",
        descriptionKo: "강력한 경제 성장과 기술주 붐"
    },
    {
        id: "lost_decade",
        name: "Lost Decade (2000-2009)",
        nameKo: "잃어버린 10년 (2000-2009)",
        startYear: 1998,
        description: "Two major crashes with near-zero total return",
        descriptionKo: "두 차례 대형 폭락, 10년 누적 수익 정체"
    }
];

