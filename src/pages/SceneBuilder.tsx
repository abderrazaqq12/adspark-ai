import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function SceneBuilder() {
  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Scene Builder</h1>
        <p className="text-muted-foreground">
          Advanced scene editing and customization tools
        </p>
      </div>

      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground">Scene Editor</CardTitle>
          <CardDescription className="text-muted-foreground">
            Manual scene creation and editing tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Scene editing tools coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
