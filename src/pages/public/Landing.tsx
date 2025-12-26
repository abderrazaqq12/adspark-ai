/**
 * Landing Page - Public Marketing Homepage
 * 
 * Sections:
 * 1. Hero - Headline + CTAs
 * 2. What FlowScale Does - 5 feature blocks
 * 3. How It Works - 3 steps
 * 4. Security & Privacy - Trust signals
 */

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    Sparkles,
    FolderOpen,
    Video,
    Copy,
    Images,
    Settings,
    ArrowRight,
    Shield,
    Lock,
    UserCheck,
    Trash2
} from 'lucide-react';

const features = [
    {
        icon: FolderOpen,
        title: 'Project-Based Pipeline',
        description: 'Organize your creative work into projects. Input assets, configure settings, generate content, and export—all in one structured workflow.',
    },
    {
        icon: Video,
        title: 'UGC Video Generation',
        description: 'Create UGC-style video ads with AI-generated scripts, voiceovers, and visual scenes. Control tone, style, and messaging.',
    },
    {
        icon: Copy,
        title: 'Creative Replicator',
        description: 'Analyze existing ad creatives and generate variations. Maintain your brand while exploring new angles.',
    },
    {
        icon: Images,
        title: 'Asset Library',
        description: 'Store, organize, and retrieve your generated outputs. Export files or delete them when no longer needed.',
    },
    {
        icon: Settings,
        title: 'User-Controlled Settings',
        description: 'Configure language, target audience, AI engines, and generation parameters. You control every aspect of the process.',
    },
];

const steps = [
    {
        number: '01',
        title: 'Create a Project',
        description: 'Start a new project and provide your product information, assets, and creative brief.',
    },
    {
        number: '02',
        title: 'Generate Content',
        description: 'Use AI engines to generate scripts, voiceover, images, and video clips based on your inputs.',
    },
    {
        number: '03',
        title: 'Render & Export',
        description: 'Render your final outputs, preview results, and export files to your preferred destinations.',
    },
];

const securityPoints = [
    {
        icon: Lock,
        title: 'OAuth-Based Connections',
        description: 'When connecting to external services, we use standard OAuth protocols. You control what access is granted.',
    },
    {
        icon: UserCheck,
        title: 'User Separation',
        description: 'Your projects and assets are isolated. Other users cannot access your content.',
    },
    {
        icon: Shield,
        title: 'Encrypted Storage',
        description: 'Sensitive data and tokens are encrypted. We follow industry-standard security practices.',
    },
    {
        icon: Trash2,
        title: 'Disconnect Anytime',
        description: 'You can disconnect integrations, delete projects, and remove assets at any time.',
    },
];

export function Landing() {
    return (
        <div className="min-h-screen">
            {/* Hero Section - Compact */}
            <section className="relative py-16 md:py-20 overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-transparent" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-3xl" />

                <div className="relative max-w-5xl mx-auto px-8 lg:px-16 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 mb-4">
                        <Sparkles className="w-4 h-4" />
                        AI-Powered Creative Pipeline
                    </div>

                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-4">
                        Generate and manage <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
                            short-form ad creatives
                        </span>
                    </h1>

                    <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 leading-relaxed">
                        FlowScale AI provides a structured production pipeline for creating video ads.
                        Input your assets, generate content with AI, and export your finished creatives.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link to="/auth">
                            <Button size="default" className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 gap-2">
                                Open App
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                        <Link to="/privacy">
                            <Button size="default" variant="outline" className="gap-2">
                                <Shield className="w-4 h-4" />
                                Security & Privacy
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* What FlowScale Does - Compact */}
            <section id="features" className="py-12 border-t border-border/50">
                <div className="max-w-6xl mx-auto px-8 lg:px-16">
                    <div className="text-center mb-8">
                        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                            What FlowScale AI Does
                        </h2>
                        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                            A complete workflow for creating AI-generated video ad content.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className="p-4 rounded-lg border border-border/50 bg-card/30 hover:bg-card/50 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
                                    <feature.icon className="w-4 h-4 text-violet-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-foreground mb-1">{feature.title}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works - Compact */}
            <section id="how-it-works" className="py-12 bg-card/30 border-t border-border/50">
                <div className="max-w-5xl mx-auto px-8 lg:px-16">
                    <div className="text-center mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                            How It Works
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Three steps from input to finished creative.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {steps.map((step, index) => (
                            <div key={step.number} className="flex flex-col items-center text-center p-4">
                                <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm mb-3">
                                    {step.number}
                                </div>
                                <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
                                <p className="text-xs text-muted-foreground">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Security & Privacy - Compact */}
            <section className="py-12 border-t border-border/50">
                <div className="max-w-6xl mx-auto px-8 lg:px-16">
                    <div className="text-center mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                            Security & Privacy
                        </h2>
                        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                            We prioritize user control and data protection.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {securityPoints.map((point) => (
                            <div
                                key={point.title}
                                className="p-4 rounded-lg border border-border/50 bg-card/30 text-center"
                            >
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                                    <point.icon className="w-4 h-4 text-emerald-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-foreground mb-1">{point.title}</h3>
                                <p className="text-xs text-muted-foreground">{point.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 text-center">
                        <Link to="/privacy">
                            <Button variant="outline" size="sm" className="gap-2">
                                Read Full Privacy Policy
                                <ArrowRight className="w-3 h-3" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* CTA Section - Compact */}
            <section className="py-10 bg-gradient-to-b from-violet-500/5 to-transparent border-t border-border/50">
                <div className="max-w-3xl mx-auto px-8 lg:px-16 text-center">
                    <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">
                        Ready to streamline your creative workflow?
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Start creating AI-powered video ads with FlowScale.
                    </p>
                    <Link to="/auth">
                        <Button size="default" className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 gap-2">
                            Get Started
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}

export default Landing;
