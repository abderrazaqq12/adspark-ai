import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Sparkles, DollarSign, TrendingUp, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Engine {
  id: string;
  name: string;
  type: string;
  cost_tier: string;
  supports_free_tier: boolean;
  description: string | null;
}

const TIER_CONFIG = {
  free: { label: "Free", icon: Sparkles, color: "text-green-500", bgColor: "bg-green-500/10" },
  cheap: { label: "Budget", icon: DollarSign, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  normal: { label: "Standard", icon: TrendingUp, color: "text-primary", bgColor: "bg-primary/10" },
  expensive: { label: "Premium", icon: Crown, color: "text-amber-500", bgColor: "bg-amber-500/10" },
};

export default function TierComparisonTable() {
  const [engines, setEngines] = useState<Engine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngines();
  }, []);

  const fetchEngines = async () => {
    const { data } = await supabase
      .from("ai_engines")
      .select("id, name, type, cost_tier, supports_free_tier, description")
      .eq("status", "active")
      .order("name");
    
    setEngines(data || []);
    setLoading(false);
  };

  const getEnginesByTier = (tier: string) => 
    engines.filter(e => e.cost_tier === tier || (tier === 'free' && e.supports_free_tier));

  const tiers = ['free', 'cheap', 'normal', 'expensive'] as const;

  if (loading) {
    return <div className="animate-pulse p-8 text-center text-muted-foreground">Loading engines...</div>;
  }

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-foreground">Engine Availability by Tier</CardTitle>
        <CardDescription className="text-muted-foreground">
          See which AI engines are available in each pricing tier
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Engine</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                {tiers.map(tier => {
                  const config = TIER_CONFIG[tier];
                  const Icon = config.icon;
                  return (
                    <TableHead key={tier} className="text-center">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${config.bgColor}`}>
                        <Icon className={`w-3 h-3 ${config.color}`} />
                        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {engines.slice(0, 20).map(engine => {
                const engineTier = engine.cost_tier || 'normal';
                return (
                  <TableRow key={engine.id} className="border-border">
                    <TableCell className="font-medium text-foreground">{engine.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {engine.type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    {tiers.map(tier => {
                      const tierIndex = tiers.indexOf(tier);
                      const engineTierIndex = tiers.indexOf(engineTier as typeof tiers[number]);
                      const isAvailable = engineTierIndex <= tierIndex;
                      
                      return (
                        <TableCell key={tier} className="text-center">
                          {isAvailable ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3 mt-6">
          {tiers.map(tier => {
            const config = TIER_CONFIG[tier];
            const Icon = config.icon;
            const tierIndex = tiers.indexOf(tier);
            const availableEngines = engines.filter(e => {
              const engineTierIndex = tiers.indexOf((e.cost_tier || 'normal') as typeof tiers[number]);
              return engineTierIndex <= tierIndex;
            });
            
            return (
              <div key={tier} className={`p-3 rounded-lg ${config.bgColor} border border-border`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className={`font-medium ${config.color}`}>{config.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{availableEngines.length}</p>
                <p className="text-xs text-muted-foreground">engines available</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
