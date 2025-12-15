import { useState } from "react";
import { StudioMarketingEngine } from "./StudioMarketingEngine";
import { StudioLandingPage } from "./StudioLandingPage";
import { Separator } from "@/components/ui/separator";

interface StudioUnifiedLandingPageProps {
    onNext: () => void;
}

export function StudioUnifiedLandingPage({ onNext }: StudioUnifiedLandingPageProps) {
    const [marketingAnglesCompleted, setMarketingAnglesCompleted] = useState(false);

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-foreground">Landing Page Creation</h2>
                <p className="text-muted-foreground">Generate marketing angles first, then compile your landing page.</p>
            </div>

            {/* Section 1: Marketing Angles & Content */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        1
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Marketing Angles & Content</h3>
                </div>
                <StudioMarketingEngine onNext={() => setMarketingAnglesCompleted(true)} />
            </div>

            <Separator className="my-6" />

            {/* Section 2: Landing Page Compiler */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                        marketingAnglesCompleted 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                    }`}>
                        2
                    </div>
                    <h3 className={`text-lg font-semibold ${
                        marketingAnglesCompleted ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                        Landing Page Compiler
                    </h3>
                </div>
                <StudioLandingPage onNext={onNext} />
            </div>
        </div>
    );
}
