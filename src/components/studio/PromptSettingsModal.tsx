/**
 * Modal for editing prompt profiles with versioning support
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, History, Bug, Save, X } from 'lucide-react';
import { usePromptProfiles, PromptType, PromptProfile, PromptVersion } from '@/hooks/usePromptProfiles';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';

interface PromptSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: PromptType;
  language: string;
  market: string;
  defaultPrompt: string;
  defaultTitle: string;
  onSaved?: (prompt: PromptProfile) => void;
}

export function PromptSettingsModal({
  isOpen,
  onClose,
  type,
  language,
  market,
  defaultPrompt,
  defaultTitle,
  onSaved
}: PromptSettingsModalProps) {
  const {
    loading,
    debugMode,
    setDebugMode,
    getActivePrompt,
    savePrompt,
    getVersionHistory,
    restoreVersion,
    generatePromptHash
  } = usePromptProfiles();

  const [title, setTitle] = useState(defaultTitle);
  const [promptText, setPromptText] = useState(defaultPrompt);
  const [currentPrompt, setCurrentPrompt] = useState<PromptProfile | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [isModified, setIsModified] = useState(false);

  // Load existing prompt on open
  useEffect(() => {
    if (isOpen) {
      loadPrompt();
    }
  }, [isOpen, type, language, market]);

  const loadPrompt = async () => {
    const existing = await getActivePrompt(type, language, market);
    if (existing) {
      setCurrentPrompt(existing);
      setTitle(existing.title);
      setPromptText(existing.prompt_text);
      const history = await getVersionHistory(existing.id);
      setVersions(history);
    } else {
      setCurrentPrompt(null);
      setTitle(defaultTitle);
      setPromptText(defaultPrompt);
      setVersions([]);
    }
    setIsModified(false);
  };

  const handleTextChange = (value: string) => {
    setPromptText(value);
    setIsModified(value !== (currentPrompt?.prompt_text || defaultPrompt));
  };

  const handleSave = async () => {
    const saved = await savePrompt(type, title, promptText, language, market);
    if (saved) {
      setCurrentPrompt(saved);
      setIsModified(false);
      const history = await getVersionHistory(saved.id);
      setVersions(history);
      onSaved?.(saved);
    }
  };

  const handleRestore = async (version: PromptVersion) => {
    if (!currentPrompt) return;
    const restored = await restoreVersion(currentPrompt.id, version);
    if (restored) {
      setCurrentPrompt(restored);
      setPromptText(restored.prompt_text);
      setIsModified(false);
      const history = await getVersionHistory(restored.id);
      setVersions(history);
      onSaved?.(restored);
    }
  };

  const currentHash = generatePromptHash(promptText);
  const typeLabels: Record<PromptType, string> = {
    marketing_angles: 'Marketing Angles',
    landing_page: 'Landing Page',
    product_content: 'Product Content',
    image_generation: 'Image Generation',
    voiceover: 'Voiceover',
    scene_breakdown: 'Scene Breakdown'
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Prompt Settings: {typeLabels[type]}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit">Edit Prompt</TabsTrigger>
            <TabsTrigger value="history" disabled={versions.length === 0}>
              <History className="w-4 h-4 mr-1" />
              History ({versions.length})
            </TabsTrigger>
            <TabsTrigger value="debug">
              <Bug className="w-4 h-4 mr-1" />
              Debug
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Prompt Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="prompt">Prompt Text</Label>
                {isModified && (
                  <Badge variant="outline" className="text-orange-500 border-orange-500">
                    Modified
                  </Badge>
                )}
              </div>
              <Textarea
                id="prompt"
                value={promptText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Enter your prompt..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Language: {language}</span>
              <span>Market: {market}</span>
              {currentPrompt && (
                <>
                  <span>Version: {currentPrompt.version}</span>
                  <span>Hash: {currentPrompt.prompt_hash}</span>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="p-3 border rounded-lg bg-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">v{version.version}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(version.created_at).toLocaleString()}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(version)}
                        disabled={loading || version.prompt_hash === currentPrompt?.prompt_hash}
                      >
                        Restore
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      Hash: {version.prompt_hash}
                    </p>
                    <p className="text-sm mt-2 line-clamp-3">
                      {version.prompt_text}
                    </p>
                  </div>
                ))}
                {versions.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No version history yet. Save a prompt to create the first version.
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="debug" className="mt-4 space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Debug Mode</p>
                <p className="text-sm text-muted-foreground">
                  Log prompt IDs and hashes during execution
                </p>
              </div>
              <Switch
                checked={debugMode}
                onCheckedChange={setDebugMode}
              />
            </div>

            <div className="p-3 border rounded-lg bg-muted/50 font-mono text-xs space-y-2">
              <p><strong>Current State:</strong></p>
              <p>Type: {type}</p>
              <p>Language: {language}</p>
              <p>Market: {market}</p>
              <p>Prompt ID: {currentPrompt?.id || 'None (will use default)'}</p>
              <p>Current Hash: {currentHash}</p>
              <p>Stored Hash: {currentPrompt?.prompt_hash || 'N/A'}</p>
              <p>Version: {currentPrompt?.version || 0}</p>
              <p>Is Modified: {isModified ? 'Yes' : 'No'}</p>
              <p>Hash Match: {currentHash === currentPrompt?.prompt_hash ? 'Yes' : 'No'}</p>
            </div>

            {currentPrompt && (
              <div className="p-3 border rounded-lg bg-green-500/10 text-green-500 text-sm">
                ✓ Prompt will be pulled from database during generation
              </div>
            )}
            {!currentPrompt && (
              <div className="p-3 border rounded-lg bg-red-500/10 text-red-500 text-sm">
                ⚠ No saved prompt. Generation will be BLOCKED until you save.
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !promptText.trim()}>
            <Save className="w-4 h-4 mr-1" />
            {loading ? 'Saving...' : 'Save Prompt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
