import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Sparkles,
} from 'lucide-react';
import type { ComplianceResult, PolicyViolation, RiskLevel } from '@/lib/creative-scale/compliance-types';

interface ComplianceStatusCardProps {
  result: ComplianceResult;
  className?: string;
}

function getRiskIcon(risk: RiskLevel) {
  switch (risk) {
    case 'safe':
      return <ShieldCheck className="h-5 w-5 text-green-500" />;
    case 'warning':
      return <ShieldAlert className="h-5 w-5 text-yellow-500" />;
    case 'high_risk':
      return <ShieldAlert className="h-5 w-5 text-orange-500" />;
    case 'blocked':
      return <ShieldX className="h-5 w-5 text-red-500" />;
    default:
      return <Shield className="h-5 w-5 text-muted-foreground" />;
  }
}

function getRiskBadgeVariant(risk: RiskLevel): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (risk) {
    case 'safe':
      return 'default';
    case 'warning':
      return 'secondary';
    case 'high_risk':
    case 'blocked':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getRiskLabel(risk: RiskLevel): string {
  switch (risk) {
    case 'safe':
      return 'Compliant';
    case 'warning':
      return 'Review Recommended';
    case 'high_risk':
      return 'Issues Found';
    case 'blocked':
      return 'Blocked';
    default:
      return 'Unknown';
  }
}

function ViolationItem({ violation }: { violation: PolicyViolation }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-start gap-2">
        {violation.severity === 'high_risk' ? (
          <XCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
        ) : violation.severity === 'warning' ? (
          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
        ) : (
          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs capitalize">
              {violation.type.replace(/_/g, ' ')}
            </Badge>
            <Badge variant={violation.severity === 'high_risk' ? 'destructive' : 'secondary'} className="text-xs">
              {violation.severity === 'high_risk' ? 'Must Fix' : 'Review'}
            </Badge>
            {violation.rewrittenText && (
              <Badge variant="default" className="text-xs bg-green-500/20 text-green-500 border-green-500/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Auto-Fixed
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">Found:</span>{' '}
            <span className="text-red-400 line-through">"{violation.originalText}"</span>
          </p>
          
          {violation.rewrittenText && (
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">Replaced with:</span>{' '}
              <span className="text-green-400">"{violation.rewrittenText}"</span>
            </p>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {expanded && (
        <div className="pt-2 border-t border-border mt-2 space-y-2">
          <p className="text-sm text-muted-foreground">{violation.explanation}</p>
          {violation.suggestion && !violation.rewrittenText && (
            <p className="text-sm">
              <span className="font-medium">Suggestion:</span> {violation.suggestion}
            </p>
          )}
          {violation.policyReference && (
            <p className="text-xs text-muted-foreground">
              Reference: {violation.policyReference}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ComplianceStatusCard({ result, className }: ComplianceStatusCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const hasViolations = result.violations.length > 0;
  const highRiskCount = result.violations.filter(v => v.severity === 'high_risk').length;
  const warningCount = result.violations.filter(v => v.severity === 'warning').length;
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getRiskIcon(result.overallRisk)}
            <CardTitle className="text-base">Policy Compliance</CardTitle>
          </div>
          <Badge variant={getRiskBadgeVariant(result.overallRisk)}>
            {getRiskLabel(result.overallRisk)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium">{result.summary}</p>
        </div>
        
        {/* Stats */}
        {hasViolations && (
          <div className="flex gap-4 text-sm">
            {highRiskCount > 0 && (
              <div className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-orange-500" />
                <span>{highRiskCount} issue{highRiskCount > 1 ? 's' : ''}</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>{warningCount} warning{warningCount > 1 ? 's' : ''}</span>
              </div>
            )}
            {result.autoFixedCount > 0 && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{result.autoFixedCount} auto-fixed</span>
              </div>
            )}
          </div>
        )}
        
        {/* Render Status */}
        <div className={`p-3 rounded-lg border ${
          result.canRender 
            ? 'bg-green-500/10 border-green-500/20' 
            : 'bg-red-500/10 border-red-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {result.canRender ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">Ready to Render</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-500">Rendering Blocked</span>
              </>
            )}
          </div>
          {!result.canRender && (
            <p className="text-xs text-muted-foreground mt-1">
              Critical policy violations must be resolved before rendering
            </p>
          )}
        </div>
        
        {/* Violations Details */}
        {hasViolations && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                {showDetails ? 'Hide' : 'Show'} Details
                {showDetails ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2">
              {result.violations.map((violation) => (
                <ViolationItem key={violation.id} violation={violation} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
