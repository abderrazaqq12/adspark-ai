/**
 * Privacy Policy Page - CRITICAL for OAuth approvals
 * 
 * Conservative, platform-compliant privacy policy.
 * Legal tone, no marketing language.
 */

export function Privacy() {
    const lastUpdated = 'December 2024';

    return (
        <div className="min-h-screen py-20">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-3xl font-bold text-foreground mb-4">Privacy Policy</h1>
                    <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
                </div>

                {/* Content */}
                <div className="prose prose-invert prose-sm max-w-none space-y-8">
                    {/* Introduction */}
                    <section>
                        <p className="text-muted-foreground leading-relaxed">
                            This Privacy Policy describes how FlowScale AI ("we", "us", or "our") collects, uses,
                            and handles information when you use our platform at flowscale.cloud (the "Service").
                        </p>
                    </section>

                    {/* Data We Collect */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">Data We Collect</h2>
                        <p className="text-muted-foreground mb-4">We collect information that you provide directly to us:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li><strong>Account Information:</strong> Email address and profile information when you create an account.</li>
                            <li><strong>Project Data:</strong> Product descriptions, creative settings, and configuration choices you provide when using the Service.</li>
                            <li><strong>Uploaded Assets:</strong> Images, videos, or other files you upload to the platform.</li>
                            <li><strong>Generated Content:</strong> Scripts, voiceovers, images, and videos generated through the Service.</li>
                            <li><strong>Integration Tokens:</strong> When you connect external services (e.g., Google Drive), we store OAuth tokens necessary to maintain those connections.</li>
                        </ul>
                    </section>

                    {/* Data We Do NOT Collect */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">Data We Do NOT Collect</h2>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>Passwords to third-party services</li>
                            <li>Payment credentials from external platforms</li>
                            <li>Content not explicitly provided by you</li>
                            <li>Personal data from external sources without your consent</li>
                        </ul>
                    </section>

                    {/* How We Use Data */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">How We Use Your Data</h2>
                        <p className="text-muted-foreground mb-4">We use the information we collect to:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>Perform generation and rendering tasks that you request</li>
                            <li>Store and retrieve your projects and outputs</li>
                            <li>Maintain connected integrations that you have enabled</li>
                            <li>Provide customer support</li>
                            <li>Improve and maintain the Service</li>
                        </ul>
                    </section>

                    {/* Storage & Security */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">Storage & Security</h2>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>Sensitive data and tokens are encrypted at rest</li>
                            <li>We implement access controls to ensure user separation</li>
                            <li>Access to production systems is limited to authorized personnel</li>
                            <li>We use secure connections (HTTPS) for all data transmission</li>
                        </ul>
                    </section>

                    {/* Third-Party Services */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">Third-Party Services</h2>
                        <p className="text-muted-foreground mb-4">
                            When you connect external services (such as Google Drive), we access those services
                            only within the scope of permissions you grant. We use standard OAuth protocols for
                            authentication. You can disconnect integrations at any time through your account settings.
                        </p>
                    </section>

                    {/* User Controls & Rights */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">Your Rights & Controls</h2>
                        <p className="text-muted-foreground mb-4">You have the right to:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>Access and export your data and generated outputs</li>
                            <li>Delete your projects, assets, and account</li>
                            <li>Disconnect third-party integrations</li>
                            <li>Revoke OAuth access tokens</li>
                            <li>Request information about what data we hold</li>
                        </ul>
                    </section>

                    {/* Data Retention */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">Data Retention</h2>
                        <p className="text-muted-foreground">
                            We retain your data for as long as your account is active or as needed to provide
                            you with the Service. If you delete your account, we will delete your associated
                            data within a reasonable timeframe, except where retention is required by law.
                        </p>
                    </section>

                    {/* Changes to Policy */}
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-4">Changes to This Policy</h2>
                        <p className="text-muted-foreground">
                            We may update this Privacy Policy from time to time. We will notify you of any
                            changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                        </p>
                    </section>

                    {/* Contact */}
                    <section className="pt-8 border-t border-border/50">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Contact Us</h2>
                        <p className="text-muted-foreground">
                            If you have questions about this Privacy Policy or our data practices, please contact us at:
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

export default Privacy;
