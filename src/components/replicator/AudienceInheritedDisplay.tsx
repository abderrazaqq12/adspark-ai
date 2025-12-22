/**
 * Audience Inherited Display
 * 
 * Shows the inherited audience from Settings → Preferences
 * This component is READ-ONLY - no manual selection allowed
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useAudience } from "@/contexts/AudienceContext";
import { getCountryByCode } from "@/lib/audience/countries";
import { getLanguageByCode } from "@/lib/audience/countries";

export function AudienceInheritedDisplay() {
  const { resolved, isLoading } = useAudience();
  
  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const country = getCountryByCode(resolved.country);
  const language = getLanguageByCode(resolved.language);
  const isConfigured = resolved.language && resolved.country;

  return (
    <Card className={`border ${isConfigured ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/50 bg-destructive/5'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isConfigured ? 'bg-green-500/20' : 'bg-destructive/20'
            }`}>
              <Globe className={`w-5 h-5 ${isConfigured ? 'text-green-500' : 'text-destructive'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-foreground">Audience Contract</span>
                {isConfigured ? (
                  <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Valid
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Not Configured
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Source: Settings → Preferences
              </p>
            </div>
          </div>
          
          {!isConfigured && (
            <Link 
              to="/settings" 
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Configure <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Language</p>
            <p className="font-medium text-foreground">
              {language ? (
                <span className="flex items-center gap-1">
                  {resolved.language.toUpperCase()}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Country</p>
            <p className="font-medium text-foreground">
              {country ? (
                <span className="flex items-center gap-1">
                  {country.flag} {country.code}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Market</p>
            <p className="font-medium text-foreground capitalize">
              {resolved.countryName || '—'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
