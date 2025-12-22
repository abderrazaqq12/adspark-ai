/**
 * StudioGoogleDrive - Google Drive Connection Component
 * 
 * Fetches connection status from backend API.
 * OAuth flow is backend-owned - frontend only triggers connect/disconnect.
 */

import { useState, useEffect } from 'react';
import { FolderOpen, ArrowRight, Link2, CheckCircle2, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useBackendConnections } from '@/hooks/useBackendConnections';

interface StudioGoogleDriveProps {
  onNext: () => void;
}

export const StudioGoogleDrive = ({ onNext }: StudioGoogleDriveProps) => {
  const { getStatus, isConnected, connect, disconnect, refresh, loading } = useBackendConnections();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const driveStatus = getStatus('google_drive');
  const connected = isConnected('google_drive');

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await connect('google_drive');
      
      if (result.redirectUrl) {
        // OAuth flow - redirect to backend-provided URL
        window.location.href = result.redirectUrl;
        return;
      }
      
      if (result.success) {
        toast.success('Google Drive connected successfully');
      } else {
        toast.error('Failed to connect Google Drive');
      }
    } catch (error) {
      toast.error('Connection failed. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const success = await disconnect('google_drive');
      if (success) {
        toast.success('Google Drive disconnected');
      } else {
        toast.error('Failed to disconnect');
      }
    } catch (error) {
      toast.error('Disconnect failed');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleContinue = () => {
    if (connected) {
      toast.success('Google Drive configuration saved');
      onNext();
    } else {
      toast.info('Connect Google Drive to continue, or skip this step');
      onNext();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Google Drive Connection</h2>
          <p className="text-muted-foreground text-sm mt-1">Connect to store assets automatically</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Badge variant="outline" className="text-primary border-primary">Layer 5</Badge>
        </div>
      </div>

      <Card className="p-6 bg-card border-border">
        <div className="space-y-5">
          {/* Connection Status */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Checking connection status...</span>
            </div>
          ) : connected ? (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-green-500">Connected</p>
                    {driveStatus?.metadata?.email && (
                      <p className="text-xs text-muted-foreground">{driveStatus.metadata.email}</p>
                    )}
                    {driveStatus?.metadata?.folderName && (
                      <p className="text-xs text-muted-foreground font-mono">
                        Folder: {driveStatus.metadata.folderName}
                      </p>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disconnect'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Not Connected</p>
                    <p className="text-xs text-muted-foreground">
                      Connect your Google Drive to automatically sync assets
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleConnect}
                  disabled={connecting}
                  className="gap-2"
                >
                  {connecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Connect Google Drive
                </Button>
              </div>
            </div>
          )}

          {/* Folder Structure Info */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <FolderOpen className="w-5 h-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Automatic Folder Structure</p>
                <p className="text-xs text-muted-foreground">
                  When connected, assets are organized automatically:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                  <li>📁 FlowScale/</li>
                  <li className="pl-4">📁 [Project Name]/</li>
                  <li className="pl-8">📁 images/</li>
                  <li className="pl-8">📁 videos/</li>
                  <li className="pl-8">📁 scripts/</li>
                  <li className="pl-8">📁 voiceovers/</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleContinue} className="gap-2">
              {connected ? 'Save & Continue' : 'Skip for Now'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};