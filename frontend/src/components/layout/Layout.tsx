import React from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { MobileLayout } from './MobileLayout';
import { DesktopLayout } from './DesktopLayout';
import type { SimulationInput, SimulationResult, ValidationWarning } from '../../logic/types';
import type { AnalysisTabType } from '../../logic/uiConstants';

export interface LayoutProps {
    input: SimulationInput;
    setInput: (input: SimulationInput) => void;
    result: SimulationResult | null;
    validationWarnings: ValidationWarning[];
    sidebarTab: string;
    setSidebarTab: (tab: string) => void;
    analysisTab: AnalysisTabType;
    setAnalysisTab: (tab: AnalysisTabType) => void;
    isMobileOverride?: boolean; // For testing or manual override
}

export function Layout(props: LayoutProps) {
    // Use media query for mobile detection (max-width: 768px)
    const isMobileQuery = useMediaQuery('(max-width: 768px)');

    // Allow override if passed (e.g. from debug tools or state)
    const isMobile = props.isMobileOverride ?? isMobileQuery;

    if (isMobile) {
        return <MobileLayout {...props} />;
    }

    return <DesktopLayout {...props} />;
}
