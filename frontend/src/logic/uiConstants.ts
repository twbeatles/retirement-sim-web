export const SIDEBAR_TABS = [
    { id: 'basic', label: '기본 정보', icon: '📋' },
    { id: 'assets', label: '자산 관리', icon: '💰' },
    { id: 'pension', label: '연금 설정', icon: '🏦' },
    { id: 'goal', label: '목표 설계', icon: '🎯' },
    { id: 'advanced', label: '고급 설정', icon: '⚙️' },
];

export type AnalysisTabType = 'charts' | 'risk' | 'compare' | 'whatif';

export const ANALYSIS_TABS: { id: AnalysisTabType; label: string }[] = [
    { id: 'risk', label: '📊 리스크 분석' },
    { id: 'compare', label: '📈 시나리오 비교' },
    { id: 'whatif', label: '🎚️ What-If' }
];
