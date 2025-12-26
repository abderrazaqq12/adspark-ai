/**
 * Contact Page
 * 
 * Simple, professional contact information.
 * No aggressive marketing, just clear support channels.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, MessageSquare, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function Contact() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate form submission
        await new Promise(resolve => setTimeout(resolve, 1000));

        toast({
            title: 'Message Sent',
            description: 'Thank you for contacting us. We will respond as soon as possible.',
        });

        setFormData({ name: '', email: '', message: '' });
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen py-20">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-foreground mb-4">Contact Us</h1>
                    <p className="text-muted-foreground">
                        Have questions or need support? We're here to help.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Contact Info */}
                    <div className="space-y-6">
                        <div className="p-5 rounded-xl border border-border/50 bg-card/30">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                                    <Mail className="w-5 h-5 text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground mb-1">Email Support</h3>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        For general inquiries and support requests.
                                    </p>
                                    <a
                                        href="mailto:support@flowscale.cloud"
                                        className="text-violet-400 hover:text-violet-300 transition-colors text-sm"
                                    >
                                        support@flowscale.cloud
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 rounded-xl border border-border/50 bg-card/30">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                                    <MessageSquare className="w-5 h-5 text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground mb-1">Response Time</h3>
                                    <p className="text-sm text-muted-foreground">
                                        We aim to respond to all inquiries within 24-48 hours during business days.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="p-6 rounded-xl border border-border/50 bg-card/30">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm text-muted-foreground">Name</Label>
                                <Input
                                    id="name"
                                    placeholder="Your name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                                    required
                                    className="bg-background/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                                    required
                                    className="bg-background/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message" className="text-sm text-muted-foreground">Message</Label>
                                <Textarea
                                    id="message"
                                    placeholder="How can we help?"
                                    rows={4}
                                    value={formData.message}
                                    onChange={(e) => setFormData(f => ({ ...f, message: e.target.value }))}
                                    required
                                    className="bg-background/50 resize-none"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full gap-2 bg-gradient-to-r from-violet-500 to-purple-600"
                                disabled={isSubmitting}
                            >
                                <Send className="w-4 h-4" />
                                {isSubmitting ? 'Sending...' : 'Send Message'}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Contact;
