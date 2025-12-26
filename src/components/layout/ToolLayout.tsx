/**
 * ToolLayout - Shared 3-Panel Layout for All Tools
 * 
 * Based on reference designs:
 * - Left: Steps/Navigation (collapsed sidebar)
 * - Center: Active panel content (scrollable)
 * - Right: Summary/Status/Actions (sticky)
 * 
 * Rules:
 * - Page itself does NOT scroll
 * - Only center panel scrolls
 * - Right panel always visible with CTAs
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ToolLayoutProps {
    /** Left sidebar content (navigation/steps) */
    sidebar?: React.ReactNode;
    /** Main content area (scrollable) */
    children: React.ReactNode;
    /** Right summary panel (sticky) */
    summary?: React.ReactNode;
    /** Optional header above content */
    header?: React.ReactNode;
    /** Custom class for main content */
    className?: string;
}

export function ToolLayout({
    sidebar,
    children,
    summary,
    header,
    className
}: ToolLayoutProps) {
    return (
        <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
            {/* Left Sidebar - Steps/Navigation */}
            {sidebar && (
                <div className="w-64 shrink-0 border-r border-border bg-card/50 overflow-y-auto scrollbar-thin">
                    {sidebar}
                </div>
            )}

            {/* Center Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Optional Header */}
                {header && (
                    <div className="shrink-0 border-b border-border bg-card/30 px-4 py-3">
                        {header}
                    </div>
                )}

                {/* Scrollable Content */}
                <div className={cn(
                    "flex-1 overflow-y-auto scrollbar-thin p-4",
                    className
                )}>
                    {children}
                </div>
            </div>

            {/* Right Summary Panel - Always Visible */}
            {summary && (
                <div className="w-72 shrink-0 border-l border-border bg-card/50 p-4 overflow-y-auto scrollbar-thin">
                    {summary}
                </div>
            )}
        </div>
    );
}

export default ToolLayout;
