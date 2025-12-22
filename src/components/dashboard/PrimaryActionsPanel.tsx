/**
 * Primary Actions Panel - Task-oriented entry points
 * Three direct links: Replicate, Edit, Quick Commerce
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Copy, 
  Wand2, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const actions = [
  {
    id: 'replicate',
    title: 'Replicate Winning Ads',
    description: 'Upload an ad and generate 10-100 variations',
    icon: Copy,
    url: '/creative-replicator',
    gradient: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-500',
  },
  {
    id: 'scale',
    title: 'Scale Creative',
    description: 'AI-powered video variation at scale',
    icon: Wand2,
    url: '/creative-scale',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-500',
  },
  {
    id: 'quick',
    title: 'Quick Commerce Ad',
    description: 'Product to video ad in minutes',
    icon: Zap,
    url: '/quick-generate',
    gradient: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-500',
  },
];

export function PrimaryActionsPanel() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          What do you want to do?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map(action => (
            <button
              key={action.id}
              onClick={() => navigate(action.url)}
              className={`
                group relative p-4 rounded-xl border border-border/50 text-left
                bg-gradient-to-br ${action.gradient}
                hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
                transition-all duration-200
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-background/80 ${action.iconColor}`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
