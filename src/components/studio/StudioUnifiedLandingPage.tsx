import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudioMarketingEngine } from "./StudioMarketingEngine";
import { StudioLandingPage } from "./StudioLandingPage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface StudioUnifiedLandingPageProps {
    onNext: () => void;
}

export function StudioUnifiedLandingPage({ onNext }: StudioUnifiedLandingPageProps) {
    const [activeTab, setActiveTab] = useState("marketing-angles");

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 mb-2">
                <h2 className="text-2xl font-bold text-foreground">Landing Page Creation</h2>
                <p className="text-muted-foreground">Generate marketing angles first, then compile your landing page.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="marketing-angles">1. Marketing Angles & Content</TabsTrigger>
                    <TabsTrigger value="landing-compiler">2. Landing Page Compiler</TabsTrigger>
                </TabsList>

                <TabsContent value="marketing-angles" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                    <StudioMarketingEngine onNext={() => setActiveTab("landing-compiler")} />
                </TabsContent>

                <TabsContent value="landing-compiler" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                    <StudioLandingPage onNext={onNext} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
