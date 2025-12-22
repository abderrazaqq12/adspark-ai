/**
 * Plan Preview Panel
 * 
 * Displays the AI-generated Creative Plan before execution.
 * The plan is READ-ONLY and acts as an execution contract.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
  Cloud,
  Lock,
  Play,
  ArrowLeft,
  Clock,
  DollarSign,
  Zap,
  ChevronDown,
  ChevronUp,
  Globe,
  Film,
} from 'lucide-react';
import { CreativePlan, VariationPlan } from '@/lib/replicator/creative-plan-types';

interface PlanPreviewPanelProps {
  plan: CreativePlan | null;
  isGenerating: boolean;
  validationErrors: string[];
  validationWarnings: string[];
  onBack: () => void;
  onLockAndGenerate: () => void;
}

export function PlanPreviewPanel({
  plan,
  isGenerating,
  validationErrors,
  validationWarnings,
  onBack,
  onLockAndGenerate,
}: PlanPreviewPanelProps) {
  const [showAllVariations, setShowAllVariations] = useState(false);

  if (!plan) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Plan Generation Failed</AlertTitle>
          <AlertDescription className="space-y-2">
            {validationErrors.map((error, i) => (
              <p key={i}>• {error}</p>
            ))}
          </AlertDescription>
        </Alert>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Configure
        </Button>
      </div>
    );
  }

  const displayVariations = showAllVariations 
    ? plan.variations 
    : plan.variations.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              AI Creative Plan
              <Badge 
                variant={plan.status === 'validated' ? 'default' : 'destructive'}
                className={plan.status === 'validated' ? 'bg-green-500/20 text-green-500' : ''}
              >
                {plan.status === 'validated' ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" /> Validated</>
                ) : (
                  <><XCircle className="w-3 h-3 mr-1" /> Invalid</>
                )}
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Review the execution plan before generating
            </p>
          </div>
        </div>
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            {validationErrors.map((error, i) => (
              <p key={i} className="mt-1">• {error}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-500">Warnings</AlertTitle>
          <AlertDescription className="text-yellow-500/80">
            {validationWarnings.map((warning, i) => (
              <p key={i} className="mt-1">• {warning}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Audience Contract */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Audience Contract
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Language</p>
              <p className="font-medium">{plan.audience.language.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Country</p>
              <p className="font-medium">{plan.audience.country}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Market</p>
              <p className="font-medium capitalize">{plan.audience.market}</p>
            </div>
          </div>
          <div className="mt-3">
            <Badge 
              variant={plan.audience.isValid ? 'default' : 'destructive'}
              className={plan.audience.isValid ? 'bg-green-500/20 text-green-500' : ''}
            >
              {plan.audience.isValid ? 'Valid' : 'Missing Configuration'}
            </Badge>
            <span className="text-xs text-muted-foreground ml-2">
              Source: Settings → Preferences
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Engine Lock */}
        <Card className={`border-2 ${plan.globalSettings.vpsAvailable ? 'border-green-500/50 bg-green-500/5' : 'border-yellow-500/50 bg-yellow-500/5'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {plan.globalSettings.vpsAvailable ? (
                <Server className="w-8 h-8 text-green-500" />
              ) : (
                <Cloud className="w-8 h-8 text-yellow-500" />
              )}
              <div>
                <p className="font-semibold">
                  {plan.globalSettings.vpsAvailable ? 'VPS Active' : 'Cloud Mode'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {plan.globalSettings.vpsAvailable 
                    ? 'Native FFmpeg execution' 
                    : 'Edge function fallback'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Duration Lock */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-primary" />
              <div>
                <p className="font-semibold">
                  {plan.globalSettings.durationMin}-{plan.globalSettings.durationMax}s
                </p>
                <p className="text-xs text-muted-foreground">
                  Duration locked
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Estimate */}
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <p className="font-semibold text-green-500">
                  ${plan.costEstimate.optimized.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {plan.costEstimate.freeCount} free, {plan.costEstimate.paidCount} paid
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Execution Strategy */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-primary" />
            <div>
              <p className="font-medium text-primary">Execution Strategy</p>
              <p className="text-sm text-muted-foreground">
                {plan.executionStrategy.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variation Plans */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Film className="w-4 h-4 text-primary" />
              Variation Plans ({plan.variations.length})
            </span>
            {plan.variations.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAllVariations(!showAllVariations)}
              >
                {showAllVariations ? (
                  <><ChevronUp className="w-4 h-4 mr-1" /> Show Less</>
                ) : (
                  <><ChevronDown className="w-4 h-4 mr-1" /> Show All</>
                )}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className={showAllVariations && plan.variations.length > 5 ? 'h-80' : ''}>
            <div className="space-y-3">
              {displayVariations.map((variation) => (
                <VariationCard key={variation.index} variation={variation} />
              ))}
            </div>
          </ScrollArea>
          {!showAllVariations && plan.variations.length > 5 && (
            <p className="text-center text-sm text-muted-foreground mt-3">
              + {plan.variations.length - 5} more variations
            </p>
          )}
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Configure
        </Button>
        <Button
          onClick={onLockAndGenerate}
          disabled={!plan.validation.isValid || isGenerating}
          size="lg"
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          {isGenerating ? (
            <>
              <Lock className="w-5 h-5 mr-2 animate-pulse" />
              Generating...
            </>
          ) : (
            <>
              <Lock className="w-5 h-5 mr-2" />
              Lock Plan & Generate
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function VariationCard({ variation }: { variation: VariationPlan }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
          {variation.index + 1}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {variation.framework}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {variation.hookType}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {variation.pacing}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {variation.reasoning.engine}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-right">
        <div>
          <p className="text-sm font-medium">{variation.targetDuration}s</p>
          <p className="text-xs text-muted-foreground">duration</p>
        </div>
        <div>
          <Badge 
            variant={variation.useVPS ? 'default' : 'secondary'}
            className={variation.useVPS ? 'bg-green-500/20 text-green-500' : ''}
          >
            {variation.useVPS ? (
              <><Server className="w-3 h-3 mr-1" /> VPS</>
            ) : (
              <><Cloud className="w-3 h-3 mr-1" /> Cloud</>
            )}
          </Badge>
        </div>
        <div className="w-16 text-right">
          <p className={`text-sm font-medium ${variation.estimatedCost === 0 ? 'text-green-500' : ''}`}>
            {variation.estimatedCost === 0 ? 'FREE' : `$${variation.estimatedCost.toFixed(2)}`}
          </p>
        </div>
      </div>
    </div>
  );
}
