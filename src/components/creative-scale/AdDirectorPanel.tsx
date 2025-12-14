/**
 * Ad Director Panel
 * Marketing-first suggestions panel with Hormozi-style insights
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Target, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  ChevronDown,
  Lightbulb,
  MessageSquare,
  Heart,
  Sparkles,
  Scale,
  Eye,
  MousePointer
} from 'lucide-react';
import type { AdDirectorReview } from '@/lib/creative-scale/ad-director';

interface AdDirectorPanelProps {
  review: AdDirectorReview;
}

export function AdDirectorPanel({ review }: AdDirectorPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('hooks');
  
  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-background to-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            Ad Director Review
          </CardTitle>
          <Badge variant="outline" className="font-mono">
            Score: {review.overallScore}/100
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Marketing-first analysis with actionable improvements
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Predictive Metrics */}
        <div className="grid grid-cols-4 gap-3">
          <MetricCard 
            label="Hook Strength"
            value={review.hookStrength}
            icon={<Zap className="w-4 h-4" />}
            color={review.hookStrength > 70 ? 'green' : review.hookStrength > 50 ? 'amber' : 'red'}
          />
          <MetricCard 
            label="CTR Potential"
            value={review.ctrPotential}
            icon={<MousePointer className="w-4 h-4" />}
            color={review.ctrPotential === 'high' ? 'green' : review.ctrPotential === 'medium' ? 'amber' : 'red'}
            isLabel
          />
          <MetricCard 
            label="Drop-off Risk"
            value={review.dropOffRisk}
            icon={<AlertTriangle className="w-4 h-4" />}
            color={review.dropOffRisk === 'low' ? 'green' : review.dropOffRisk === 'early' ? 'red' : 'amber'}
            isLabel
          />
          <MetricCard 
            label="CTA Pressure"
            value={review.ctaPressure}
            icon={<Target className="w-4 h-4" />}
            color={review.ctaPressure > 60 ? 'green' : review.ctaPressure > 40 ? 'amber' : 'red'}
          />
        </div>

        {/* Hormozi Value Insights */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Hormozi Value Analysis</span>
            <span className="ml-auto text-lg font-bold text-primary">
              {review.hormoziInsights.overallValue.toFixed(1)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <ValueCheck label="Dream Outcome Clear" checked={review.hormoziInsights.dreamOutcomeClear} />
            <ValueCheck label="Likelihood Built" checked={review.hormoziInsights.likelihoodBuilt} />
            <ValueCheck label="Time Delay Minimized" checked={review.hormoziInsights.timeDelayMinimized} />
            <ValueCheck label="Effort Reduced" checked={review.hormoziInsights.effortReduced} />
          </div>
          <div className="mt-3 pt-3 border-t border-primary/20">
            <span className="text-xs text-muted-foreground">Top Priority: </span>
            <span className="text-xs font-medium text-primary">{review.hormoziInsights.topPriority}</span>
          </div>
        </div>

        {/* Tabbed Suggestions */}
        <Tabs defaultValue="hooks" className="w-full">
          <TabsList className="grid grid-cols-4 h-9">
            <TabsTrigger value="hooks" className="text-xs">Hooks</TabsTrigger>
            <TabsTrigger value="cta" className="text-xs">CTAs</TabsTrigger>
            <TabsTrigger value="objections" className="text-xs">Objections</TabsTrigger>
            <TabsTrigger value="emotions" className="text-xs">Emotions</TabsTrigger>
          </TabsList>

          <TabsContent value="hooks" className="mt-3">
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {review.hookRewrites.map((hook) => (
                  <SuggestionCard
                    key={hook.id}
                    type={hook.type}
                    suggestion={hook.rewrite}
                    reason={hook.whyBetter}
                    lift={hook.expectedLift}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="cta" className="mt-3">
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {review.ctaRewrites.map((cta) => (
                  <SuggestionCard
                    key={cta.id}
                    type={cta.type}
                    suggestion={cta.rewrite}
                    reason={cta.whyBetter}
                    tactic={cta.conversionTactic}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="objections" className="mt-3">
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {review.objectionHandlers.map((obj, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium">{obj.objection}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{obj.suggestedResponse}</p>
                    <div className="flex items-center gap-2 text-[10px]">
                      <Badge variant="outline" className="text-[10px]">{obj.placementAdvice}</Badge>
                      <span className="text-muted-foreground">{obj.hormoziPrinciple}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="emotions" className="mt-3">
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {review.emotionalUpgrades.map((emo, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-500" />
                        <span className="text-sm font-medium capitalize">{emo.angle}</span>
                      </div>
                      <Badge 
                        variant={emo.currentStrength === 'weak' ? 'destructive' : 'secondary'}
                        className="text-[10px]"
                      >
                        Currently {emo.currentStrength}
                      </Badge>
                    </div>
                    <p className="text-xs mb-2">{emo.suggestion}</p>
                    <p className="text-xs text-muted-foreground">{emo.implementation}</p>
                    <p className="text-[10px] text-primary mt-2 italic">{emo.psychologyBehind}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Edit Suggestions */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium text-muted-foreground hover:text-foreground">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Edit Suggestions ({review.editSuggestions.length})
            <ChevronDown className="w-4 h-4 ml-auto" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="space-y-2">
              {review.editSuggestions.map((edit, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{edit.segment}</span>
                    <Badge variant="outline" className="text-[10px]">{edit.impact}</Badge>
                  </div>
                  <p className="text-muted-foreground mb-1"><strong>Issue:</strong> {edit.issue}</p>
                  <p><strong>Fix:</strong> {edit.fix}</p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'green' | 'amber' | 'red';
  isLabel?: boolean;
}

function MetricCard({ label, value, icon, color, isLabel }: MetricCardProps) {
  const colorClass = {
    green: 'text-green-500 bg-green-500/10 border-green-500/30',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    red: 'text-red-500 bg-red-500/10 border-red-500/30'
  }[color];

  return (
    <div className={`p-3 rounded-lg border ${colorClass}`}>
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className="font-bold text-lg capitalize">
        {isLabel ? value : `${value}`}
        {!isLabel && <span className="text-xs font-normal text-muted-foreground">/100</span>}
      </div>
    </div>
  );
}

function ValueCheck({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${checked ? 'bg-green-500' : 'bg-red-500/50'}`} />
      <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}

interface SuggestionCardProps {
  type: string;
  suggestion: string;
  reason: string;
  lift?: string;
  tactic?: string;
}

function SuggestionCard({ type, suggestion, reason, lift, tactic }: SuggestionCardProps) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="secondary" className="text-xs capitalize">{type.replace('_', ' ')}</Badge>
        {lift && (
          <Badge 
            variant={lift === 'high' ? 'default' : 'outline'}
            className="text-[10px]"
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            {lift} lift
          </Badge>
        )}
      </div>
      <p className="text-sm font-medium mb-1">"{suggestion}"</p>
      <p className="text-xs text-muted-foreground">{reason}</p>
      {tactic && (
        <p className="text-[10px] text-primary mt-2">{tactic}</p>
      )}
    </div>
  );
}
