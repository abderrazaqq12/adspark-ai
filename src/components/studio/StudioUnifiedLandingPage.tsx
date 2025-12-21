import { StudioMarketingEngine } from "./StudioMarketingEngine";

interface StudioUnifiedLandingPageProps {
    onNext: () => void;
}

export function StudioUnifiedLandingPage({ onNext }: StudioUnifiedLandingPageProps) {
    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-foreground">Marketing Angles & Content</h2>
                <p className="text-muted-foreground">Generate marketing angles and content for your product.</p>
            </div>

            <StudioMarketingEngine onNext={onNext} />
        </div>
    );
}
