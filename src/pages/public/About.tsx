/**
 * About Page - Company Information
 * 
 * Professional, neutral description of FlowScale AI.
 * No performance guarantees or exaggerated claims.
 */

import { Sparkles, Target, Users, Shield } from 'lucide-react';

const values = [
    {
        icon: Target,
        title: 'Transparency',
        description: 'Clear inputs, outputs, and processes. You always know what is happening with your data and content.',
    },
    {
        icon: Users,
        title: 'User Control',
        description: 'You decide what to create, what to connect, and what to delete. The platform responds to your actions.',
    },
    {
        icon: Shield,
        title: 'Privacy First',
        description: 'Your data is yours. We implement access controls, user separation, and secure storage practices.',
    },
];

export function About() {
    return (
        <div className="min-h-screen py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 mb-6">
                        <Sparkles className="w-4 h-4" />
                        About FlowScale
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                        About FlowScale AI
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                        FlowScale AI is a software platform for building and managing creative production workflows.
                        We provide tools to help users generate, organize, and export AI-powered video ad content.
                    </p>
                </div>

                {/* What We Do */}
                <section className="mb-16">
                    <h2 className="text-xl font-semibold text-foreground mb-4">What We Do</h2>
                    <div className="prose prose-invert max-w-none">
                        <p className="text-muted-foreground leading-relaxed">
                            FlowScale AI offers a structured pipeline for creating short-form video advertisements.
                            Users can input their product information and creative requirements, then use AI-powered
                            tools to generate scripts, voiceovers, images, and video content. The platform organizes
                            all outputs into projects for easy management and export.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-4">
                            We focus on providing reliable, user-controlled creative tools. The platform does not make
                            autonomous decisions—all generation and export actions are initiated and controlled by the user.
                        </p>
                    </div>
                </section>

                {/* Our Values */}
                <section className="mb-16">
                    <h2 className="text-xl font-semibold text-foreground mb-6">Our Approach</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {values.map((value) => (
                            <div
                                key={value.title}
                                className="p-5 rounded-xl border border-border/50 bg-card/30"
                            >
                                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
                                    <value.icon className="w-5 h-5 text-violet-400" />
                                </div>
                                <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                                <p className="text-sm text-muted-foreground">{value.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Contact */}
                <section className="p-6 rounded-xl border border-border/50 bg-card/30 text-center">
                    <h2 className="text-lg font-semibold text-foreground mb-2">Questions?</h2>
                    <p className="text-muted-foreground mb-4">
                        If you have questions about FlowScale AI or need support, please contact us.
                    </p>
                    <a
                        href="mailto:support@flowscale.cloud"
                        className="text-violet-400 hover:text-violet-300 transition-colors"
                    >
                        support@flowscale.cloud
                    </a>
                </section>
            </div>
        </div>
    );
}

export default About;
