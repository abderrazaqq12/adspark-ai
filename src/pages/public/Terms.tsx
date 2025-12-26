/**
 * Terms of Service Page
 * 
 * Standard terms covering service usage, user responsibilities,
 * limitations, and legal matters.
 */

export function Terms() {
    const lastUpdated = 'December 2024';

    return (
        <div className="min-h-screen py-20">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-3xl font-bold text-foreground mb-4">Terms of Service</h1>
                    <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
                </div>

                {/* Content */}
                <div className="prose prose-invert prose-sm max-w-none space-y-8">
                    {/* Introduction */}
                    <section>
                        <p className="text-muted-foreground leading-relaxed">
                            These Terms of Service ("Terms") govern your use of FlowScale AI ("Service")
                            provided by FlowScale ("we", "us", or "our"). By accessing or using the Service,
                            you agree to be bound by these Terms.
                        </p>
                    </section>

                    {/* Service Description */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">1. Service Description</h2>
                        <p className="text-muted-foreground">
                            FlowScale AI is a creative production platform that provides tools for generating
                            and managing AI-powered video ad content. The Service includes project management,
                            AI content generation (scripts, voiceovers, images, videos), asset storage, and export capabilities.
                        </p>
                    </section>

                    {/* Account Registration */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">2. Account Registration</h2>
                        <p className="text-muted-foreground">
                            To use the Service, you must create an account and provide accurate information.
                            You are responsible for maintaining the security of your account credentials and
                            for all activities that occur under your account.
                        </p>
                    </section>

                    {/* User Responsibilities */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">3. User Responsibilities</h2>
                        <p className="text-muted-foreground mb-4">By using the Service, you agree to:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>Only upload content that you have the right to use</li>
                            <li>Ensure generated content complies with applicable advertising platform policies</li>
                            <li>Not use the Service to create illegal, harmful, or misleading content</li>
                            <li>Not attempt to circumvent security measures or access other users' data</li>
                            <li>Comply with all applicable laws and regulations</li>
                        </ul>
                    </section>

                    {/* Intellectual Property */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">4. Intellectual Property</h2>
                        <p className="text-muted-foreground">
                            You retain ownership of content you upload to the Service. You grant us a limited
                            license to store and process your content solely to provide the Service. Generated
                            content is subject to the terms of the underlying AI models used, which may have
                            their own usage restrictions.
                        </p>
                    </section>

                    {/* No Performance Guarantees */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">5. No Performance Guarantees</h2>
                        <p className="text-muted-foreground">
                            The Service provides tools for creating creative content. We do not guarantee any
                            particular outcomes, results, or performance of content created using the Service.
                            The effectiveness of generated ads depends on many factors outside our control.
                        </p>
                    </section>

                    {/* Service Availability */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">6. Service Availability</h2>
                        <p className="text-muted-foreground">
                            We strive to maintain reliable service availability but do not guarantee uninterrupted
                            access. The Service may be temporarily unavailable for maintenance, updates, or due
                            to circumstances beyond our control.
                        </p>
                    </section>

                    {/* Limitation of Liability */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">7. Limitation of Liability</h2>
                        <p className="text-muted-foreground">
                            To the maximum extent permitted by law, FlowScale shall not be liable for any indirect,
                            incidental, special, consequential, or punitive damages, or any loss of profits or
                            revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill,
                            or other intangible losses resulting from your use of the Service.
                        </p>
                    </section>

                    {/* Termination */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">8. Termination</h2>
                        <p className="text-muted-foreground">
                            We may suspend or terminate your access to the Service at our discretion, including
                            for violations of these Terms. You may also terminate your account at any time.
                            Upon termination, your right to use the Service ceases immediately.
                        </p>
                    </section>

                    {/* Changes to Terms */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">9. Changes to Terms</h2>
                        <p className="text-muted-foreground">
                            We reserve the right to modify these Terms at any time. We will notify you of
                            material changes by posting the updated Terms on the Service. Your continued use
                            of the Service after changes constitutes acceptance of the updated Terms.
                        </p>
                    </section>

                    {/* Governing Law */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">10. Governing Law</h2>
                        <p className="text-muted-foreground">
                            These Terms shall be governed by and construed in accordance with applicable law,
                            without regard to its conflict of law provisions.
                        </p>
                    </section>

                    {/* Contact */}
                    <section className="pt-8 border-t border-border/50">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Contact</h2>
                        <p className="text-muted-foreground">
                            If you have questions about these Terms, please contact us at:
                        </p>
                        <p className="mt-4">
                            <a
                                href="mailto:support@flowscale.cloud"
                                className="text-violet-400 hover:text-violet-300 transition-colors"
                            >
                                support@flowscale.cloud
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default Terms;
