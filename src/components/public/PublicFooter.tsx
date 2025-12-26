/**
 * PublicFooter - Footer for public pages
 * 
 * Includes:
 * - Logo + tagline
 * - Link sections (Product, Legal, Support)
 * - Copyright
 */

import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const footerSections = [
    {
        title: 'Product',
        links: [
            { label: 'Features', href: '/#features' },
            { label: 'How It Works', href: '/#how-it-works' },
            { label: 'Open App', href: '/app' },
        ],
    },
    {
        title: 'Legal',
        links: [
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
        ],
    },
    {
        title: 'Support',
        links: [
            { label: 'About', href: '/about' },
            { label: 'Contact', href: '/contact' },
        ],
    },
];

export function PublicFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-border/50 bg-card/30">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {/* Brand Column */}
                    <div className="col-span-2 md:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-semibold text-foreground">FlowScale</span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            AI-powered creative production pipeline for short-form video ads.
                        </p>
                    </div>

                    {/* Link Sections */}
                    {footerSections.map((section) => (
                        <div key={section.title}>
                            <h4 className="text-sm font-semibold text-foreground mb-4">{section.title}</h4>
                            <ul className="space-y-2">
                                {section.links.map((link) => (
                                    <li key={link.href}>
                                        <Link
                                            to={link.href}
                                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom Bar */}
                <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                        © {currentYear} FlowScale AI. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4">
                        <a
                            href="mailto:support@flowscale.cloud"
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            support@flowscale.cloud
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default PublicFooter;
