import React, { useState } from "react";

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
            onClick={() => setIsVisible(!isVisible)}
        >
            {children || <span className="tooltip-trigger">❓</span>}

            {isVisible && <div className="tooltip-popup animate-fadeIn">{content}</div>}
        </span>
    );
};

