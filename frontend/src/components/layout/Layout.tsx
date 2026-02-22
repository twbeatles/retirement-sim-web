import React from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { MobileLayout } from './MobileLayout';
import { DesktopLayout } from './DesktopLayout';
import type { LayoutSharedProps } from './types';

export interface LayoutProps extends LayoutSharedProps {
    isMobileOverride?: boolean; // For testing or manual override
}

export const Layout = React.memo(function Layout(props: LayoutProps) {
    // Use media query for mobile detection (max-width: 768px)
    const isMobileQuery = useMediaQuery('(max-width: 768px)');

    // Allow override if passed (e.g. from debug tools or state)
    const isMobile = props.isMobileOverride ?? isMobileQuery;

    if (isMobile) {
        return <MobileLayout {...props} />;
    }

    return <DesktopLayout {...props} />;
});
