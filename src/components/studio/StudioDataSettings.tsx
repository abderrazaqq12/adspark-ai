import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FolderOpen, Link2, Sheet, CheckCircle2, Loader2, Save, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DataSettings {
  google_drive_folder_url: string;
  google_drive_access_token: string;
  google_sheet_url: string;
  google_sheet_id: string;
}

export const StudioDataSettings = () => {
  const { user, token } = useAuth();
  const [settings, setSettings] = useState<DataSettings>({
    google_drive_folder_url: '',
    google_drive_access_token: '',
    google_sheet_url: '',
    google_sheet_id: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [driveConnected, setDriveConnected] = useState(false);
  const [sheetConnected, setSheetConnected] = useState(false);

  useEffect(() => {
    if (user && token) {
      loadSettings();
    }
  }, [user, token]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) throw new Error('Failed to load settings');

      const data = await response.json();

      if (data?.preferences) {
        const prefs = typeof data.preferences === 'string'
          ? JSON.parse(data.preferences)
          : data.preferences;

        const loadedSettings = {
          google_drive_folder_url: prefs.google_drive_folder_url || '',
          google_drive_access_token: prefs.google_drive_access_token || '',
          google_sheet_url: prefs.google_sheet_url || '',
          google_sheet_id: prefs.google_sheet_id || '',
        };
        setSettings(loadedSettings);
        setDriveConnected(!!loadedSettings.google_drive_folder_url);
        setSheetConnected(!!loadedSettings.google_sheet_id);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Don't toast error on load to avoid spamming user
    } finally {
      setIsLoading(false);
    }
  };

  const extractSheetId = (url: string): string | null => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const extractDriveFolderId = (url: string): string | null => {
    const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleSheetUrlChange = (url: string) => {
    setSettings(prev => ({ ...prev, google_sheet_url: url }));
    const sheetId = extractSheetId(url);
    if (sheetId) {
      setSettings(prev => ({ ...prev, google_sheet_id: sheetId }));
      setSheetConnected(true);
    } else {
      setSheetConnected(false);
    }
  };

  const handleDriveUrlChange = (url: string) => {
    setSettings(prev => ({ ...prev, google_drive_folder_url: url }));
    const folderId = extractDriveFolderId(url);
    setDriveConnected(!!folderId);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!user || !token) throw new Error('Not authenticated');

      // 1. Get current settings to merge
      const response = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let currentPrefs: Record<string, any> = {};
      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          currentPrefs = typeof data.preferences === 'string'
            ? JSON.parse(data.preferences)
            : data.preferences;
        }
      }

      // 2. Merge and Save
      const saveResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          key: 'preferences',
          value: {
            ...currentPrefs,
            ...settings
          }
        })
      });

      if (!saveResponse.ok) throw new Error('Failed to save settings');

      toast.success('Data settings saved successfully');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Google Drive Integration */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Google Drive Integration</CardTitle>
                <CardDescription>Connect your Google Drive folder for automatic asset storage</CardDescription>
              </div>
            </div>
            {driveConnected && (
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              Google Drive Folder URL
            </Label>
            <Input
              value={settings.google_drive_folder_url}
              onChange={(e) => handleDriveUrlChange(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/xxxxx"
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Paste the URL of your Google Drive folder with edit access. New project folders will be created here automatically.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Access Token (Required for auto-folder creation)
            </Label>
            <Input
              type="password"
              value={settings.google_drive_access_token}
              onChange={(e) => setSettings(prev => ({ ...prev, google_drive_access_token: e.target.value }))}
              placeholder="ya29.xxxxxxxxxxxxxxxx"
              className="bg-background border-border"
            />
            <div className="p-3 rounded-lg bg-muted/50 border border-border mt-2">
              <p className="text-xs font-medium text-foreground mb-2">How to get an access token:</p>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></li>
                <li>Create a project (or select existing)</li>
                <li>Enable the <strong>Google Drive API</strong></li>
                <li>Create OAuth 2.0 credentials (Web application)</li>
                <li>Use <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OAuth Playground</a> to generate a token</li>
                <li>Select <code className="bg-muted px-1 rounded">drive.file</code> scope and authorize</li>
                <li>Copy the access token and paste it here</li>
              </ol>
              <p className="text-xs text-amber-500 mt-2">
                ⚠️ Access tokens expire after 1 hour. For production use, implement refresh token flow.
              </p>
            </div>
          </div>

          {driveConnected && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500 font-medium">Folder URL validated</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                New product folders will be created inside this folder when you start a Studio project.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Sheets Integration */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Sheet className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Google Sheets Integration</CardTitle>
                <CardDescription>Link a Google Sheet as your centralized data source for Studio</CardDescription>
              </div>
            </div>
            {sheetConnected && (
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              Google Sheet URL
            </Label>
            <Input
              value={settings.google_sheet_url}
              onChange={(e) => handleSheetUrlChange(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit"
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Paste the full URL of your Google Sheet. This sheet will be used by the Studio workflow for batch product processing.
            </p>
          </div>

          {sheetConnected && settings.google_sheet_id && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500 font-medium">Sheet connected</span>
                  </div>
                  <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    ID: {settings.google_sheet_id.substring(0, 12)}...
                  </code>
                </div>
              </div>

              {/* Sheet Structure Info */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-start gap-3">
                  <Sheet className="w-5 h-5 text-primary mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Required Sheet Structure</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• <span className="font-mono">Column A:</span> Product Name</li>
                      <li>• <span className="font-mono">Column B:</span> Product URL</li>
                      <li>• <span className="font-mono">Column C:</span> Description</li>
                      <li>• <span className="font-mono">Column D-H:</span> AI Prompts 1-5</li>
                      <li>• <span className="font-mono">Column I:</span> Status</li>
                    </ul>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary"
                      onClick={() => window.open(settings.google_sheet_url, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open Sheet
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="bg-border" />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Data Settings
        </Button>
      </div>
    </div>
  );
};
