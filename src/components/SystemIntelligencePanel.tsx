/**
 * SYSTEM INTELLIGENCE PANEL
 * 
 * Displays read-only status of the Global AI Brain systems:
 * - AI Cost Optimizer (auto-minimizes costs across all tools)
 * - Decision Scoring System (scores engines based on cost, quality, market fit)
 * 
 * This is informational only - no user controls.
 * The system makes all decisions automatically.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  DollarSign, 
  Target, 
  CheckCircle2, 
  Zap,
  TrendingDown,
  Shield
} from 'lucide-react';
import { useGlobalAIBrain } from '@/hooks/useGlobalAIBrain';

export function SystemIntelligencePanel() {
  const { stats, availableProviders, loading } = useGlobalAIBrain();

  const totalProviders = availableProviders.length;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">System Intelligence</CardTitle>
            <CardDescription>
              Global AI decision-making and cost optimization layer
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Cost Optimizer */}
        <div className="p-4 rounded-lg border border-border bg-gradient-to-r from-green-500/5 to-transparent">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">AI Cost Optimizer</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically minimizes cost across all tools
                </p>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="w-4 h-4 text-green-500" />
                <span className="text-lg font-bold text-foreground">Auto</span>
              </div>
              <p className="text-xs text-muted-foreground">Optimization Mode</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <div className="text-lg font-bold text-foreground">{stats.availableProviderCount}</div>
              <p className="text-xs text-muted-foreground">Available Engines</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <div className="text-lg font-bold text-foreground">{stats.decisionsCount}</div>
              <p className="text-xs text-muted-foreground">Optimizations</p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Zap className="w-3 h-3 text-primary" />
              <span><strong>Strategy:</strong> FFmpeg first → Free AI → Low-cost AI → Premium only when required</span>
            </p>
          </div>
        </div>

        {/* Decision Scoring System */}
        <div className="p-4 rounded-lg border border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Decision Scoring System</h4>
                <p className="text-sm text-muted-foreground">
                  Internal scoring for optimal engine selection
                </p>
              </div>
            </div>
            <Badge className="bg-primary/20 text-primary border-primary/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Scope</span>
              </div>
              <p className="text-xs text-muted-foreground">Global - All current and future tools</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Scoring Factors</span>
              </div>
              <p className="text-xs text-muted-foreground">Cost, Quality, Market, Platform, Latency</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2">
            {['Cost', 'Quality', 'Market', 'Platform', 'Speed'].map((factor, i) => (
              <div key={factor} className="text-center">
                <div className="h-2 rounded-full bg-muted overflow-hidden mb-1">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${[30, 25, 20, 15, 10][i]}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{factor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Applied To */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-sm font-medium text-foreground mb-2">Applies Automatically To:</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Creative Replicator</Badge>
            <Badge variant="secondary">Scene Builder</Badge>
            <Badge variant="secondary">AI Tools</Badge>
            <Badge variant="secondary">Image Generation</Badge>
            <Badge variant="secondary">Video Generation</Badge>
            <Badge variant="outline" className="text-muted-foreground">+ All Future Tools</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
