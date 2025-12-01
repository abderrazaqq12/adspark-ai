import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";

export default function Projects() {
  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">My Projects</h1>
        <p className="text-muted-foreground">
          Manage and organize your video ad projects
        </p>
      </div>

      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground">Projects</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your saved video projects will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No projects yet. Create your first video to get started!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
