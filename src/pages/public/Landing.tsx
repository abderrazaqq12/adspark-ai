/**
 * Landing Page - FlowScale AI
 * Premium landing page for AI-powered video ad creation
 */

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    ArrowRight,
    Play,
    Sparkles,
    Zap,
    Video,
    Wand2,
    Layers,
    Download,
    CheckCircle2,
    Star,
    Users,
    Clock,
    Shield
} from 'lucide-react';

// Features data
const features = [
    {
        icon: Wand2,
        title: 'AI Script Generation',
        description: 'Transform your product into compelling ad scripts using proven marketing frameworks like PAS, AIDA, and more.',
    },
    {
        icon: Video,
        title: 'UGC Video Factory',
        description: 'Generate authentic user-generated style content with AI avatars and natural voiceovers.',
    },
    {
        icon: Layers,
        title: 'Creative Replicator',
        description: 'Analyze winning ads and replicate their success patterns for your own products.',
    },
    {
        icon: Zap,
        title: 'Quick Generate',
        description: 'Go from idea to finished video ad in minutes, not days. Batch create multiple variations.',
    },
    {
        icon: Download,
        title: 'Export Ready',
        description: 'Download in formats optimized for TikTok, Instagram Reels, YouTube Shorts, and more.',
    },
    {
        icon: Shield,
        title: 'Brand Consistency',
        description: 'Save your brand colors, fonts, and templates for consistent creative output across campaigns.',
    },
];

// Steps data
const steps = [
    {
        number: '1',
        title: 'Describe your product',
        description: 'Enter your product details and select a marketing framework. Our AI analyzes and creates conversion-focused scripts.',
        image: '/placeholder.svg',
    },
    {
        number: '2',
        title: 'Customize your creative',
        description: 'Choose AI avatars, voice styles, and visual templates. Adjust the tone, pacing, and call-to-action.',
        image: '/placeholder.svg',
    },
    {
        number: '3',
        title: 'Generate & export',
        description: 'Render your video in HD quality. Download directly or create variations for A/B testing.',
        image: '/placeholder.svg',
    },
];

// Stats
const stats = [
    { value: '10K+', label: 'Videos Created' },
    { value: '500+', label: 'Active Creators' },
    { value: '< 3 min', label: 'Avg. Generation' },
    { value: '4.9/5', label: 'User Rating' },
];

export function Landing() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0">
                    <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-gradient-to-br from-violet-600/20 via-purple-500/10 to-transparent rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[40%] bg-gradient-to-tr from-indigo-600/15 via-violet-500/10 to-transparent rounded-full blur-[100px]" />
                </div>

                <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
                    {/* Badge */}
                    <div className="flex justify-center mb-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20">
                            <Users className="w-4 h-4 text-violet-400" />
                            <span className="text-sm text-violet-300 font-medium">Trusted by 500+ video creators</span>
                        </div>
                    </div>

                    {/* Headline */}
                    <div className="text-center max-w-4xl mx-auto mb-8">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6">
                            AI-Powered Ad Creation —
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400">
                                Simple, Fast & Professional
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
                            Create studio-quality video ads in minutes. Just describe your product — our AI handles scripts, avatars, and editing.
                        </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                        <Link to="/auth">
                            <Button size="lg" className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 gap-2 h-12 px-8">
                                Get started
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                        <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5 gap-2 h-12 px-8">
                            <Play className="w-4 h-4" />
                            Watch demo
                        </Button>
                    </div>

                    {/* Video Preview */}
                    <div className="relative max-w-4xl mx-auto">
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm shadow-2xl shadow-violet-500/10">
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                            {/* Placeholder content */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-all group">
                                    <Play className="w-8 h-8 text-white ml-1 group-hover:scale-110 transition-transform" />
                                </div>
                            </div>

                            {/* Demo image placeholder */}
                            <img
                                src="/placeholder.svg"
                                alt="FlowScale AI Demo"
                                className="w-full h-full object-cover opacity-60"
                            />
                        </div>

                        {/* Glow effect */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-indigo-500/20 rounded-3xl blur-2xl -z-10" />
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="py-8 border-y border-white/5 bg-white/[0.02]">
                <div className="max-w-6xl mx-auto px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                                <div className="text-sm text-white/50">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 md:py-28">
                <div className="max-w-6xl mx-auto px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
                            <Sparkles className="w-4 h-4 text-violet-400" />
                            <span className="text-sm text-violet-300 font-medium">How It Works</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Create amazing ads
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
                                in 3 simple steps
                            </span>
                        </h2>
                    </div>

                    {/* Steps */}
                    <div className="grid md:grid-cols-3 gap-8">
                        {steps.map((step) => (
                            <div key={step.number} className="relative group">
                                <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-violet-500/30 transition-all h-full">
                                    {/* Step Number */}
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold mb-4">
                                        {step.number}
                                    </div>

                                    {/* Content */}
                                    <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                                    <p className="text-white/50 text-sm leading-relaxed mb-4">{step.description}</p>

                                    {/* Image placeholder */}
                                    <div className="aspect-video rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-white/5 flex items-center justify-center">
                                        <Video className="w-8 h-8 text-violet-400/50" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 md:py-28 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
                            <Zap className="w-4 h-4 text-violet-400" />
                            <span className="text-sm text-violet-300 font-medium">Features</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Everything you need to create
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
                                professional video ads
                            </span>
                        </h2>
                    </div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className="group bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-violet-500/30 hover:bg-white/[0.05] transition-all"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center mb-4 group-hover:border-violet-500/50 transition-colors">
                                    <feature.icon className="w-6 h-6 text-violet-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                                <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 md:py-28">
                <div className="max-w-4xl mx-auto px-6 lg:px-8">
                    <div className="relative bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-transparent rounded-3xl border border-violet-500/20 p-8 md:p-12 text-center overflow-hidden">
                        {/* Background glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-violet-500/20 blur-[100px] -z-10" />

                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Ready to create your first video ad?
                        </h2>
                        <p className="text-white/60 text-lg mb-8 max-w-2xl mx-auto">
                            Join thousands of marketers using FlowScale AI to create high-converting video ads in minutes.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/auth">
                                <Button size="lg" className="bg-white hover:bg-white/90 text-black font-semibold shadow-lg gap-2 h-12 px-8">
                                    Start creating for free
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>

                        {/* Trust indicators */}
                        <div className="flex items-center justify-center gap-6 mt-8 text-sm text-white/40">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span>No credit card required</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-violet-400" />
                                <span>Setup in 2 minutes</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Landing;
