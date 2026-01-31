import React, { useState } from 'react';

interface TooltipProps {
    content: string;
    children?: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <span
            className="tooltip-container"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onClick={() => setIsVisible(!isVisible)} // Mobile support
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'help', marginLeft: '4px' }}
        >
            {children || <span style={{ fontSize: '0.8em', color: 'var(--text-sub)' }}>❓</span>}

            {isVisible && (
                <div className="tooltip-popup animate-fadeIn">
                    {content}
                </div>
            )}

            <style>{`
                .tooltip-popup {
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--bg-card);
                    color: var(--text-main);
                    border: 1px solid var(--border);
                    padding: 8px 12px;
                    border-radius: var(--radius);
                    font-size: 0.8rem;
                    width: 200px;
                    z-index: 1000;
                    box-shadow: var(--shadow-md);
                    margin-bottom: 8px;
                    white-space: normal;
                    line-height: 1.4;
                    pointer-events: none;
                }
                .tooltip-popup::after {
                    content: "";
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -5px;
                    border-width: 5px;
                    border-style: solid;
                    border-color: var(--border) transparent transparent transparent;
                }
            `}</style>
        </span>
    );
};
