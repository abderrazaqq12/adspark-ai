import { Card, CardContent } from "@/components/ui/card";
import { FileCode } from "lucide-react";

export default function LandingPages() {
  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Landing Pages</h1>
        <p className="text-muted-foreground">
          All your generated landing pages and links
        </p>
      </div>
      
      <Card className="bg-gradient-card border-border">
        <CardContent className="py-16 text-center">
          <FileCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No landing pages yet</h3>
          <p className="text-muted-foreground">Generated landing pages will appear here</p>
        </CardContent>
      </Card>
    </div>
  );
}