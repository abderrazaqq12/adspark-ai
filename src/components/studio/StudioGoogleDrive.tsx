import { useState } from 'react';
import { FolderOpen, ArrowRight, Link2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface StudioGoogleDriveProps {
  onNext: () => void;
}

export const StudioGoogleDrive = ({ onNext }: StudioGoogleDriveProps) => {
  const [folderUrl, setFolderUrl] = useState('');
  const [folderId, setFolderId] = useState('');
  const [connected, setConnected] = useState(false);
  const { toast } = useToast();

  const handleConnect = () => {
    if (!folderUrl) {
      toast({
        title: "URL Required",
        description: "Please enter a Google Drive folder URL",
        variant: "destructive",
      });
      return;
    }

    // Extract folder ID from URL
    const match = folderUrl.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    if (match) {
      setFolderId(match[1]);
      setConnected(true);
      toast({
        title: "Connected!",
        description: "Successfully connected to Google Drive folder",
      });
    } else {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Google Drive folder URL",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    toast({
      title: "Google Drive Configured",
      description: "Folder connection saved successfully",
    });
    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Google Drive Linking</h2>
          <p className="text-muted-foreground text-sm mt-1">Configure asset storage location</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Layer 5</Badge>
      </div>

      <Card className="p-6 bg-card border-border">
        <div className="space-y-5">
          {/* Folder URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Google Drive Folder URL
            </label>
            <div className="flex gap-2">
              <Input
                value={folderUrl}
                onChange={(e) => setFolderUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="bg-background border-border"
              />
              <Button variant="outline" onClick={handleConnect}>
                Connect
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste the full URL of your Google Drive folder with edit access
            </p>
          </div>

          {/* Connection Status */}
          {connected && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-500">Connected</p>
                  <p className="text-xs text-muted-foreground font-mono">Folder ID: {folderId}</p>
                </div>
              </div>
            </div>
          )}

          {/* Folder Info */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <FolderOpen className="w-5 h-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Folder Structure</p>
                <p className="text-xs text-muted-foreground">
                  A subfolder will be created for each product with the following structure:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                  <li>📁 [Product Name]/</li>
                  <li className="pl-4">📁 images/</li>
                  <li className="pl-4">📁 videos/</li>
                  <li className="pl-4">📁 scripts/</li>
                  <li className="pl-4">📁 voiceovers/</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} className="gap-2" disabled={!connected}>
              Save & Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
