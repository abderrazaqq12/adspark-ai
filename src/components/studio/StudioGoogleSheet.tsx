import { useState } from 'react';
import { Sheet, ArrowRight, Link2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface StudioGoogleSheetProps {
  onNext: () => void;
}

export const StudioGoogleSheet = ({ onNext }: StudioGoogleSheetProps) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [connected, setConnected] = useState(false);
  const { toast } = useToast();

  const handleConnect = () => {
    if (!sheetUrl) {
      toast({
        title: "URL Required",
        description: "Please enter a Google Sheet URL",
        variant: "destructive",
      });
      return;
    }

    // Extract sheet ID from URL
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      setSheetId(match[1]);
      setConnected(true);
      toast({
        title: "Connected!",
        description: "Successfully connected to Google Sheet",
      });
    } else {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Google Sheets URL",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    toast({
      title: "Google Sheet Configured",
      description: "Sheet connection saved successfully",
    });
    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Google Sheet Linking</h2>
          <p className="text-muted-foreground text-sm mt-1">Connect to your centralized data source</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Layer 4</Badge>
      </div>

      <Card className="p-6 bg-card border-border">
        <div className="space-y-5">
          {/* Sheet URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Google Sheet URL
            </label>
            <div className="flex gap-2">
              <Input
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="bg-background border-border"
              />
              <Button variant="outline" onClick={handleConnect}>
                Connect
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste the full URL of your Google Sheet
            </p>
          </div>

          {/* Connection Status */}
          {connected && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-500">Connected</p>
                  <p className="text-xs text-muted-foreground font-mono">Sheet ID: {sheetId}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sheet Info */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <Sheet className="w-5 h-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Required Sheet Structure</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Column A: Product Name</li>
                  <li>• Column B: Product URL</li>
                  <li>• Column C: Description</li>
                  <li>• Column D-H: AI Prompts 1-5</li>
                  <li>• Column I: Status</li>
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
