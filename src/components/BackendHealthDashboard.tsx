import { useRenderBackendStatus } from "@/hooks/useRenderBackendStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Server, Cloud, Zap, RefreshCw, CheckCircle2, XCircle, Clock, Star } from "lucide-react";

export function BackendHealthDashboard() {
  const backendStatus = useRenderBackendStatus();

  const services = [
    {
      id: 'vps',
      name: 'VPS Server (RenderFlow)',
      description: 'Self-hosted video rendering with FFmpeg',
      icon: Server,
      available: backendStatus.vpsServer.available,
      latency: backendStatus.vpsServer.latency,
      version: backendStatus.vpsServer.version,
      recommended: backendStatus.recommended === 'vps',
    },
    {
      id: 'edge',
      name: 'Edge Functions',
      description: 'Serverless functions for processing',
      icon: Zap,
      available: backendStatus.edgeFunctions.available,
      latency: backendStatus.edgeFunctions.latency,
      recommended: backendStatus.recommended === 'edge',
    },
    {
      id: 'cloud',
      name: 'Cloudinary API',
      description: 'Cloud-based video transformations',
      icon: Cloud,
      available: backendStatus.cloudinaryApi.available,
      configured: backendStatus.cloudinaryApi.configured,
      recommended: backendStatus.recommended === 'cloud',
    },
  ];

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              Backend Services
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Monitor connected render backends and their status
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={backendStatus.refresh}
            disabled={backendStatus.loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${backendStatus.loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className={`p-4 rounded-lg border transition-all ${
                  service.available
                    ? 'bg-green-500/5 border-green-500/30'
                    : 'bg-muted/20 border-border'
                } ${service.recommended ? 'ring-2 ring-primary/50' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${
                      service.available ? 'bg-green-500/20' : 'bg-muted/50'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        service.available ? 'text-green-500' : 'text-muted-foreground'
                      }`} />
                    </div>
                    {service.recommended && (
                      <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                        <Star className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  {service.available ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                
                <h4 className="font-medium text-foreground text-sm mb-1">
                  {service.name}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {service.description}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      service.available 
                        ? 'text-green-500 border-green-500/50' 
                        : 'text-muted-foreground border-muted'
                    }`}
                  >
                    {service.available ? 'Online' : 'Offline'}
                  </Badge>
                  
                  {service.latency && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 mr-1" />
                      {service.latency}ms
                    </Badge>
                  )}
                  
                  {service.version && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      v{service.version}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Auto-Selection:</span> The system automatically uses the best available backend. 
            VPS is preferred for speed, Edge Functions as fallback, and Cloudinary for cloud rendering.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
