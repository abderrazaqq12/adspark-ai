import { Card, CardContent } from "@/components/ui/card";
import { Image as ImageIcon } from "lucide-react";

export default function Images() {
  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Image Library</h1>
        <p className="text-muted-foreground">
          All your generated and uploaded images
        </p>
      </div>
      
      <Card className="bg-gradient-card border-border">
        <CardContent className="py-16 text-center">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No images yet</h3>
          <p className="text-muted-foreground">Generated images will appear here</p>
        </CardContent>
      </Card>
    </div>
  );
}