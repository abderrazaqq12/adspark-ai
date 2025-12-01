import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check } from "lucide-react";

const engines = [
  {
    name: "Runway Gen-3 Alpha",
    status: "Coming Soon",
    description: "Professional-grade video generation with excellent motion and consistency",
    features: ["4K output", "Advanced motion", "Style control"],
  },
  {
    name: "OpenAI Sora 2",
    status: "Coming Soon",
    description: "State-of-the-art video generation with photorealistic quality",
    features: ["Photorealistic", "Long duration", "Complex scenes"],
  },
  {
    name: "Google Veo 3.1",
    status: "Coming Soon",
    description: "High-quality video generation with fast processing",
    features: ["Fast generation", "High quality", "Multiple styles"],
  },
  {
    name: "Hailuo Video",
    status: "Coming Soon",
    description: "Efficient video generation for marketing content",
    features: ["Marketing focused", "Quick turnaround", "Cost effective"],
  },
  {
    name: "Pika Labs",
    status: "Coming Soon",
    description: "Creative video generation with unique artistic styles",
    features: ["Artistic styles", "Animation", "Effects"],
  },
];

export default function Engines() {
  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">AI Video Engines</h1>
        <p className="text-muted-foreground">
          Choose from multiple AI models for video generation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {engines.map((engine, index) => (
          <Card key={index} className="bg-gradient-card border-border shadow-card hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">{engine.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1 bg-secondary/20 text-secondary border-secondary/30">
                      {engine.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <CardDescription className="text-muted-foreground mt-2">
                {engine.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {engine.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
