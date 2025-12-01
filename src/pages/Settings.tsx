import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Key, Save } from "lucide-react";

export default function Settings() {
  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your AI video generation engines and preferences
        </p>
      </div>

      {/* API Keys */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            AI Engine API Keys
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Add your API keys for video generation engines (coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="runway-key" className="text-foreground">Runway Gen-3 API Key</Label>
            <Input
              id="runway-key"
              type="password"
              placeholder="sk-..."
              className="bg-muted/50 border-input"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a href="https://runwayml.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                runwayml.com
              </a>
            </p>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-2">
            <Label htmlFor="sora-key" className="text-foreground">OpenAI Sora API Key</Label>
            <Input
              id="sora-key"
              type="password"
              placeholder="sk-..."
              className="bg-muted/50 border-input"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a href="https://platform.openai.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                platform.openai.com
              </a>
            </p>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-2">
            <Label htmlFor="veo-key" className="text-foreground">Google Veo API Key</Label>
            <Input
              id="veo-key"
              type="password"
              placeholder="AIza..."
              className="bg-muted/50 border-input"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a href="https://ai.google.dev" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                ai.google.dev
              </a>
            </p>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-2">
            <Label htmlFor="hailuo-key" className="text-foreground">Hailuo Video API Key</Label>
            <Input
              id="hailuo-key"
              type="password"
              placeholder="..."
              className="bg-muted/50 border-input"
              disabled
            />
          </div>

          <Button disabled className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Save className="w-4 h-4 mr-2" />
            Save API Keys
          </Button>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground">Generation Preferences</CardTitle>
          <CardDescription className="text-muted-foreground">
            Customize your default video generation settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
