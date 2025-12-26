/**
 * PublicHeader - Navigation header for public pages
 * 
 * Clean, professional SaaS header with:
 * - Logo + brand name
 * - Navigation links
 * - CTA button
 */

import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navLinks = [
    { label: 'About', href: '/about' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Contact', href: '/contact' },
];

export function PublicHeader() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-semibold text-foreground">FlowScale</span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                to={link.href}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* CTA */}
                    <div className="flex items-center gap-3">
                        <Link to="/auth">
                            <Button variant="ghost" size="sm" className="text-muted-foreground">
                                Sign In
                            </Button>
                        </Link>
                        <Link to="/app">
                            <Button size="sm" className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/20">
                                Open App
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default PublicHeader;
