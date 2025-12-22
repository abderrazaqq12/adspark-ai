/**
 * AI Decision Debug Panel - Read-only transparency panel
 * 
 * Shows AI decisions for trust & power users:
 * - Why a certain engine was chosen
 * - Why FFmpeg vs AI video was used
 * - Which model was selected per variation
 * - Duration decisions
 * - Cost per video
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Brain, Cpu, Clock, DollarSign, Sparkles, Film, 
  ChevronRight, Zap, BarChart3
} from "lucide-react";
import type { BrainOutput, AIVariationDecision } from "@/lib/replicator/ai-creative-brain";

interface AIDecisionDebugPanelProps {
  brainOutput: BrainOutput;
}

export const AIDecisionDebugPanel = ({ brainOutput }: AIDecisionDebugPanelProps) => {
  const [selectedVariation, setSelectedVariation] = useState<number>(0);
  
  const { decisions, costEstimate, optimizationStrategy, globalSettings } = brainOutput;
  const currentDecision = decisions[selectedVariation];

  // Calculate stats
  const freeCount = decisions.filter(d => d.engineTier === 'free').length;
  const lowCount = decisions.filter(d => d.engineTier === 'low').length;
  const mediumCount = decisions.filter(d => d.engineTier === 'medium').length;
  const premiumCount = decisions.filter(d => d.engineTier === 'premium').length;

  const frameworkDistribution = decisions.reduce((acc, d) => {
    acc[d.framework] = (acc[d.framework] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="border-muted bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-500" />
          AI Brain Decisions
          <Badge variant="secondary" className="text-xs">Read-only</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="variations">Per Variation</TabsTrigger>
            <TabsTrigger value="costs">Cost Breakdown</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Global Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-background/50 border border-border">
                <div className="text-xs text-muted-foreground mb-1">Primary Framework</div>
                <div className="font-medium text-primary">{globalSettings.primaryFramework}</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border border-border">
                <div className="text-xs text-muted-foreground mb-1">Primary Hook</div>
                <div className="font-medium text-primary">{globalSettings.primaryHook}</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border border-border">
                <div className="text-xs text-muted-foreground mb-1">Duration Range</div>
                <div className="font-medium">
                  {globalSettings.enforedMinDuration}s - {globalSettings.enforcedMaxDuration}s
                </div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border border-border">
                <div className="text-xs text-muted-foreground mb-1">Optimization</div>
                <div className="text-xs font-medium text-green-500">{optimizationStrategy}</div>
              </div>
            </div>

            {/* Engine Distribution */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Engine Tier Distribution</div>
              <div className="flex gap-2">
                {freeCount > 0 && (
                  <Badge className="bg-green-500/20 text-green-400">
                    Free: {freeCount}
                  </Badge>
                )}
                {lowCount > 0 && (
                  <Badge className="bg-blue-500/20 text-blue-400">
                    Low: {lowCount}
                  </Badge>
                )}
                {mediumCount > 0 && (
                  <Badge className="bg-orange-500/20 text-orange-400">
                    Medium: {mediumCount}
                  </Badge>
                )}
                {premiumCount > 0 && (
                  <Badge className="bg-purple-500/20 text-purple-400">
                    Premium: {premiumCount}
                  </Badge>
                )}
              </div>
            </div>

            {/* Framework Distribution */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Marketing Framework Mix</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(frameworkDistribution).map(([framework, count]) => (
                  <Badge key={framework} variant="outline" className="text-xs">
                    {framework}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Per Variation Tab */}
          <TabsContent value="variations" className="space-y-4">
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>Framework</TableHead>
                    <TableHead>Hook</TableHead>
                    <TableHead>Engine</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decisions.map((decision, index) => (
                    <TableRow 
                      key={index}
                      className={`cursor-pointer ${selectedVariation === index ? 'bg-primary/10' : ''}`}
                      onClick={() => setSelectedVariation(index)}
                    >
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {decision.framework}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{decision.hookType}</TableCell>
                      <TableCell>
                        <Badge 
                          className={`text-[10px] ${
                            decision.engineTier === 'free' ? 'bg-green-500/20 text-green-400' :
                            decision.engineTier === 'low' ? 'bg-blue-500/20 text-blue-400' :
                            decision.engineTier === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}
                        >
                          {decision.selectedProvider}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{decision.targetDuration}s</TableCell>
                      <TableCell className="text-right text-xs">
                        ${decision.estimatedCost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Selected Variation Details */}
            {currentDecision && (
              <Card className="bg-background/50">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">
                    Variation {selectedVariation + 1} - AI Reasoning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-start gap-2">
                    <Film className="w-3 h-3 text-primary mt-0.5" />
                    <div>
                      <span className="text-muted-foreground">Framework: </span>
                      <span>{currentDecision.reasoning.frameworkReason}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Cpu className="w-3 h-3 text-primary mt-0.5" />
                    <div>
                      <span className="text-muted-foreground">Engine: </span>
                      <span>{currentDecision.reasoning.engineReason}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-3 h-3 text-primary mt-0.5" />
                    <div>
                      <span className="text-muted-foreground">Duration: </span>
                      <span>{currentDecision.reasoning.durationReason}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Cost Breakdown Tab */}
          <TabsContent value="costs" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                <DollarSign className="w-5 h-5 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-500">
                  ${costEstimate.minimum.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">Minimum</div>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center">
                <Zap className="w-5 h-5 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary">
                  ${costEstimate.optimized.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">AI Optimized</div>
              </div>
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 text-center">
                <BarChart3 className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-500">
                  ${costEstimate.maximum.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">Maximum</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <div className="font-medium mb-2">Cost Optimization Strategy</div>
              <p className="text-muted-foreground text-xs">
                {optimizationStrategy}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-3 h-3" />
                  Free tier (FFMPEG) used for {freeCount} variations
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-3 h-3" />
                  AI video generation used for {decisions.length - freeCount} variations
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-3 h-3" />
                  Average cost per video: ${(costEstimate.optimized / decisions.length).toFixed(3)}
                </li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
