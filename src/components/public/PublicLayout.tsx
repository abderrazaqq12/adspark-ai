/**
 * PublicLayout - Wrapper for public pages
 * 
 * Provides:
 * - PublicHeader
 * - Main content area
 * - PublicFooter
 * - Dark theme enforcement
 */

import React from 'react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface PublicLayoutProps {
    children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <PublicHeader />
            <main className="flex-1 pt-16">
                {children}
            </main>
            <PublicFooter />
        </div>
    );
}

export default PublicLayout;
