import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  Rocket, 
  Layers, 
  ArrowRight,
  Zap,
  Clock,
  Users,
  Video
} from "lucide-react";

const workflows = [
  {
    id: "quick-commerce",
    title: "Quick Commerce",
    description: "1-click video ad generation. Perfect for fast TikTok ads.",
    icon: Rocket,
    url: "/quick-commerce",
    badge: "Fastest",
    badgeVariant: "default" as const,
    features: ["Product → Video in minutes", "Auto content generation", "Multi-language support"],
    gradient: "from-primary/20 via-primary/10 to-transparent",
    iconBg: "bg-primary/20",
    iconColor: "text-primary"
  },
  {
    id: "studio",
    title: "Studio",
    description: "Advanced 12-layer editing system for full control.",
    icon: Layers,
    url: "/studio",
    badge: "Advanced",
    badgeVariant: "secondary" as const,
    features: ["Scene-by-scene control", "Custom prompts", "Manual engine selection"],
    gradient: "from-secondary/20 via-secondary/10 to-transparent",
    iconBg: "bg-secondary/20",
    iconColor: "text-secondary"
  }
];

export function WorkflowCards() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {workflows.map((workflow) => (
        <Card 
          key={workflow.id}
          className="bg-gradient-card border-border shadow-card hover:shadow-lg transition-all duration-300 group cursor-pointer overflow-hidden"
          onClick={() => navigate(workflow.url)}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${workflow.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
          
          <CardHeader className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-12 h-12 rounded-xl ${workflow.iconBg} flex items-center justify-center`}>
                <workflow.icon className={`w-6 h-6 ${workflow.iconColor}`} />
              </div>
              <Badge variant={workflow.badgeVariant} className="text-xs">
                {workflow.badge}
              </Badge>
            </div>
            <CardTitle className="text-foreground group-hover:text-primary transition-colors">
              {workflow.title}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {workflow.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="relative">
            <ul className="space-y-2 mb-4">
              {workflow.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  {feature}
                </li>
              ))}
            </ul>
            
            <Button 
              className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
              variant="outline"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function WorkflowStats() {
  const stats = [
    { icon: Zap, label: "Avg. Generation Time", value: "3 min", color: "text-primary" },
    { icon: Video, label: "Videos Generated", value: "10K+", color: "text-secondary" },
    { icon: Users, label: "Active Users", value: "500+", color: "text-accent" },
    { icon: Clock, label: "Time Saved", value: "1000+ hrs", color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div 
          key={idx}
          className="flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border"
        >
          <stat.icon className={`w-5 h-5 ${stat.color}`} />
          <div>
            <p className="text-lg font-semibold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
