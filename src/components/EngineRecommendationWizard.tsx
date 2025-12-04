import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Wand2, DollarSign, Video, Star, ArrowRight, ArrowLeft, CheckCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Engine {
  id: string;
  name: string;
  type: string;
  description: string | null;
  pricing_model: string | null;
  supports_free_tier: boolean | null;
  priority_score: number | null;
  max_duration_sec: number | null;
  config: any;
}

interface WizardAnswers {
  budget: "free" | "low" | "medium" | "high" | null;
  videoType: "product" | "ugc" | "avatar" | "explainer" | "social" | null;
  quality: "draft" | "standard" | "premium" | null;
  duration: "short" | "medium" | "long" | null;
}

interface RecommendedEngine {
  engine: Engine;
  score: number;
  reasons: string[];
}

export default function EngineRecommendationWizard() {
  const [engines, setEngines] = useState<Engine[]>([]);
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<WizardAnswers>({
    budget: null,
    videoType: null,
    quality: null,
    duration: null,
  });
  const [recommendations, setRecommendations] = useState<RecommendedEngine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngines();
  }, []);

  const fetchEngines = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_engines")
        .select("*")
        .eq("status", "active")
        .order("priority_score", { ascending: false });

      if (error) throw error;
      setEngines(data || []);
    } catch (error) {
      console.error("Error fetching engines:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRecommendations = () => {
    const scored: RecommendedEngine[] = engines.map(engine => {
      let score = engine.priority_score || 50;
      const reasons: string[] = [];
      const config = engine.config || {};

      // Budget scoring
      if (answers.budget === "free") {
        if (engine.supports_free_tier) {
          score += 30;
          reasons.push("Has free tier");
        } else {
          score -= 40;
        }
      } else if (answers.budget === "low") {
        if (engine.supports_free_tier || engine.pricing_model === "free_tier") {
          score += 20;
          reasons.push("Budget-friendly");
        }
      } else if (answers.budget === "high") {
        if (config.quality === "ultra") {
          score += 20;
          reasons.push("Premium quality");
        }
      }

      // Video type scoring
      if (answers.videoType === "product") {
        if (engine.type === "image_to_video" || engine.type === "text_to_video") {
          score += 25;
          reasons.push("Great for product videos");
        }
        if (config.specialty === "product_animation") {
          score += 15;
        }
      } else if (answers.videoType === "ugc") {
        if (engine.type === "avatar" && config.specialty === "ugc_ads") {
          score += 35;
          reasons.push("Optimized for UGC content");
        }
      } else if (answers.videoType === "avatar") {
        if (engine.type === "avatar") {
          score += 35;
          reasons.push("Professional avatar generation");
        }
      } else if (answers.videoType === "explainer") {
        if (engine.type === "template_based") {
          score += 25;
          reasons.push("Template-based for explainers");
        }
      } else if (answers.videoType === "social") {
        if (config.specialty === "short_form" || config.specialty === "social_media") {
          score += 25;
          reasons.push("Optimized for social media");
        }
      }

      // Quality scoring
      if (answers.quality === "premium") {
        if (config.quality === "ultra") {
          score += 25;
          reasons.push("Ultra-high quality output");
        }
      } else if (answers.quality === "draft") {
        if (engine.supports_free_tier) {
          score += 15;
          reasons.push("Quick draft generation");
        }
      }

      // Duration scoring
      if (answers.duration === "long" && engine.max_duration_sec && engine.max_duration_sec >= 60) {
        score += 15;
        reasons.push(`Supports up to ${engine.max_duration_sec}s videos`);
      } else if (answers.duration === "short" && engine.max_duration_sec && engine.max_duration_sec <= 15) {
        score += 10;
        reasons.push("Optimized for short clips");
      }

      return { engine, score, reasons };
    });

    // Sort by score and take top 5
    const topRecommendations = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    setRecommendations(topRecommendations);
    setStep(5);
  };

  const resetWizard = () => {
    setStep(1);
    setAnswers({ budget: null, videoType: null, quality: null, duration: null });
    setRecommendations([]);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return answers.budget !== null;
      case 2: return answers.videoType !== null;
      case 3: return answers.quality !== null;
      case 4: return answers.duration !== null;
      default: return true;
    }
  };

  const nextStep = () => {
    if (step === 4) {
      calculateRecommendations();
    } else {
      setStep(step + 1);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          Engine Recommendation Wizard
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Answer a few questions to get personalized engine recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        {step < 5 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {step} of 4</span>
              <span>{Math.round((step / 4) * 100)}%</span>
            </div>
            <Progress value={(step / 4) * 100} className="h-2" />
          </div>
        )}

        {/* Step 1: Budget */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              What's your budget?
            </h3>
            <RadioGroup
              value={answers.budget || ""}
              onValueChange={(v) => setAnswers({ ...answers, budget: v as WizardAnswers["budget"] })}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { value: "free", label: "Free Only", desc: "Use free tier engines only" },
                { value: "low", label: "Low Budget", desc: "< $50/month" },
                { value: "medium", label: "Medium Budget", desc: "$50-200/month" },
                { value: "high", label: "High Budget", desc: "$200+/month for premium" },
              ].map((option) => (
                <div key={option.value} className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  answers.budget === option.value ? "bg-primary/20 border-primary" : "bg-muted/20 border-border hover:border-primary/50"
                }`}>
                  <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                  <Label htmlFor={option.value} className="cursor-pointer">
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Step 2: Video Type */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              What type of videos do you want to create?
            </h3>
            <RadioGroup
              value={answers.videoType || ""}
              onValueChange={(v) => setAnswers({ ...answers, videoType: v as WizardAnswers["videoType"] })}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { value: "product", label: "Product Videos", desc: "Showcase products with motion" },
                { value: "ugc", label: "UGC Ads", desc: "User-generated content style" },
                { value: "avatar", label: "Avatar Videos", desc: "AI spokesperson videos" },
                { value: "explainer", label: "Explainer Videos", desc: "Educational content" },
                { value: "social", label: "Social Media", desc: "Short-form viral content" },
              ].map((option) => (
                <div key={option.value} className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  answers.videoType === option.value ? "bg-primary/20 border-primary" : "bg-muted/20 border-border hover:border-primary/50"
                }`}>
                  <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                  <Label htmlFor={option.value} className="cursor-pointer">
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Step 3: Quality */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              What quality level do you need?
            </h3>
            <RadioGroup
              value={answers.quality || ""}
              onValueChange={(v) => setAnswers({ ...answers, quality: v as WizardAnswers["quality"] })}
              className="grid grid-cols-3 gap-4"
            >
              {[
                { value: "draft", label: "Draft", desc: "Quick previews, testing" },
                { value: "standard", label: "Standard", desc: "Good for most use cases" },
                { value: "premium", label: "Premium", desc: "Highest quality output" },
              ].map((option) => (
                <div key={option.value} className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  answers.quality === option.value ? "bg-primary/20 border-primary" : "bg-muted/20 border-border hover:border-primary/50"
                }`}>
                  <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                  <Label htmlFor={option.value} className="cursor-pointer">
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Step 4: Duration */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              What video length do you typically need?
            </h3>
            <RadioGroup
              value={answers.duration || ""}
              onValueChange={(v) => setAnswers({ ...answers, duration: v as WizardAnswers["duration"] })}
              className="grid grid-cols-3 gap-4"
            >
              {[
                { value: "short", label: "Short", desc: "5-15 seconds" },
                { value: "medium", label: "Medium", desc: "15-60 seconds" },
                { value: "long", label: "Long", desc: "1-5 minutes" },
              ].map((option) => (
                <div key={option.value} className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  answers.duration === option.value ? "bg-primary/20 border-primary" : "bg-muted/20 border-border hover:border-primary/50"
                }`}>
                  <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                  <Label htmlFor={option.value} className="cursor-pointer">
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Step 5: Recommendations */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Your Recommended Engines
            </h3>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div
                  key={rec.engine.id}
                  className={`p-4 rounded-lg border transition-all ${
                    index === 0 ? "bg-primary/10 border-primary" : "bg-muted/20 border-border"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                          {rec.engine.name}
                          {index === 0 && <Badge className="bg-primary/20 text-primary">Best Match</Badge>}
                        </h4>
                        <p className="text-sm text-muted-foreground">{rec.engine.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        Score: {rec.score}
                      </Badge>
                    </div>
                  </div>
                  {rec.reasons.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {rec.reasons.map((reason, i) => (
                        <span key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          {step > 1 && step < 5 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          ) : step === 5 ? (
            <Button variant="outline" onClick={resetWizard}>
              Start Over
            </Button>
          ) : (
            <div />
          )}
          
          {step < 5 && (
            <Button onClick={nextStep} disabled={!canProceed()} className="bg-gradient-primary">
              {step === 4 ? "Get Recommendations" : "Next"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
