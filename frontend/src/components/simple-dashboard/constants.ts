import type { HousingStatus } from "../../logic/types";

export const STEPS = [
    { id: "basic", title: "기본 정보", icon: "📋", description: "나이와 은퇴 목표를 설정하세요" },
    { id: "assets", title: "자산 현황", icon: "💰", description: "현재 보유 자산을 입력하세요" },
    { id: "savings", title: "저축 계획", icon: "🏦", description: "월 저축 금액을 설정하세요" },
    { id: "result", title: "결과 확인", icon: "📊", description: "은퇴 준비도를 확인하세요" }
] as const;

export type SimpleDashboardPreset = {
    id: string;
    label: string;
    icon: string;
    savings: number;
    asset: number;
};

export const PRESETS: SimpleDashboardPreset[] = [
    { id: "worker", label: "직장인", icon: "👔", savings: 1000000, asset: 50000000 },
    { id: "public", label: "공무원", icon: "🏛️", savings: 800000, asset: 30000000 },
    { id: "self", label: "자영업자", icon: "🏪", savings: 1500000, asset: 80000000 }
];

export const HOUSING_OPTIONS: Array<{ id: HousingStatus; label: string }> = [
    { id: "own_outright", label: "무주담 주택" },
    { id: "mortgage", label: "주담대 보유" },
    { id: "jeonse", label: "전세" },
    { id: "rent", label: "월세" }
];
