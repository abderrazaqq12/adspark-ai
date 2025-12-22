import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Server, 
  Cloud, 
  Container, 
  Laptop, 
  CheckCircle2, 
  ExternalLink,
  Info
} from 'lucide-react';
import { config, isCloud } from '@/config';
import { VPSServerStatus } from './VPSServerStatus';

interface DeploymentSettingsProps {
  onSave?: () => void;
}

const DEPLOYMENT_MODES = [
  { 
    id: 'cloud', 
    label: 'Cloud', 
    icon: Cloud, 
    description: 'Managed infrastructure with Supabase',
    color: 'text-primary'
  },
  { 
    id: 'self-hosted', 
    label: 'Self-Hosted', 
    icon: Server, 
    description: 'Your own infrastructure',
    color: 'text-blue-500'
  },
  { 
    id: 'docker', 
    label: 'Docker', 
    icon: Container, 
    description: 'Containerized deployment',
    color: 'text-cyan-500'
  },
  { 
    id: 'local', 
    label: 'Local Development', 
    icon: Laptop, 
    description: 'Development mode',
    color: 'text-amber-500'
  },
];

export default function DeploymentSettings({ onSave }: DeploymentSettingsProps) {
  const [currentMode] = useState(config.deploymentTarget);

  return (
    <div className="space-y-6">
      {/* Deployment Mode Display */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Deployment Mode</CardTitle>
              <CardDescription>Current deployment environment detected</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DEPLOYMENT_MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = mode.id === currentMode;
              
              return (
                <div
                  key={mode.id}
                  className={`p-4 rounded-lg border transition-all ${
                    isActive 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-muted/30 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${isActive ? mode.color : 'text-muted-foreground'}`} />
                    {isActive && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                  <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {mode.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{mode.description}</p>
                </div>
              );
            })}
          </div>

          {isCloud() && (
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Running on Cloud</p>
                <p className="text-muted-foreground">Backend services are managed via Supabase. Configure your AI provider in the Preferences tab.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Self-Hosting Info */}
      {!isCloud() && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Self-Hosting Resources</CardTitle>
            <CardDescription>Documentation for self-hosted deployments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" asChild>
                <a href="/SELF_HOSTING.md" target="_blank" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Self-Hosting Guide
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://docs.lovable.dev" target="_blank" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Documentation
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* VPS Server Status */}
      <VPSServerStatus />
    </div>
  );
}
