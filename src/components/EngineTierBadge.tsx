import { Badge } from "@/components/ui/badge";
import { Sparkles, DollarSign, TrendingUp, Crown } from "lucide-react";

interface EngineTierBadgeProps {
  tier: string;
  size?: "sm" | "default";
}

const TIER_CONFIG: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  free: { label: "Free", icon: Sparkles, color: "text-green-500", bgColor: "bg-green-500/15 border-green-500/30" },
  cheap: { label: "Budget", icon: DollarSign, color: "text-blue-500", bgColor: "bg-blue-500/15 border-blue-500/30" },
  normal: { label: "Standard", icon: TrendingUp, color: "text-primary", bgColor: "bg-primary/15 border-primary/30" },
  expensive: { label: "Premium", icon: Crown, color: "text-amber-500", bgColor: "bg-amber-500/15 border-amber-500/30" },
};

export default function EngineTierBadge({ tier, size = "default" }: EngineTierBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.normal;
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={`${config.bgColor} ${size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs"}`}
    >
      <Icon className={`${size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} mr-1 ${config.color}`} />
      <span className={config.color}>{config.label}</span>
    </Badge>
  );
}
