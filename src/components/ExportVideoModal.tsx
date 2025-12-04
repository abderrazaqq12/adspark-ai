import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  FileVideo, 
  Loader2, 
  CheckCircle,
  Film,
  Subtitles,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExportVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scriptId: string;
  projectId?: string;
  scenesCount?: number;
}

type ExportFormat = "mp4" | "mov" | "webm";

interface FormatOption {
  value: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

const formatOptions: FormatOption[] = [
  { 
    value: "mp4", 
    label: "MP4 (H.264)", 
    description: "Best compatibility for all platforms",
    icon: <FileVideo className="w-5 h-5" />,
    recommended: true
  },
  { 
    value: "mov", 
    label: "MOV (ProRes)", 
    description: "High quality for editing software",
    icon: <Film className="w-5 h-5" />
  },
  { 
    value: "webm", 
    label: "WebM (VP9)", 
    description: "Optimized for web playback",
    icon: <Sparkles className="w-5 h-5" />
  },
];

type ExportStatus = "idle" | "preparing" | "assembling" | "encoding" | "completed" | "error";

export default function ExportVideoModal({
  open,
  onOpenChange,
  scriptId,
  projectId,
  scenesCount = 0
}: ExportVideoModalProps) {
  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [addSubtitles, setAddSubtitles] = useState(true);
  const [addWatermark, setAddWatermark] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const statusMessages: Record<ExportStatus, string> = {
    idle: "Ready to export",
    preparing: "Preparing scenes...",
    assembling: "Assembling video clips...",
    encoding: "Encoding final video...",
    completed: "Export completed!",
    error: "Export failed"
  };

  const handleExport = async () => {
    setExportStatus("preparing");
    setProgress(10);
    setErrorMessage(null);

    try {
      // Call the assemble-video edge function
      setProgress(25);
      setExportStatus("assembling");

      const response = await supabase.functions.invoke('assemble-video', {
        body: {
          scriptId,
          projectId,
          format,
          addSubtitles,
          addWatermark
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setProgress(75);
      setExportStatus("encoding");

      // Simulate encoding time (in reality, this would be async with webhooks)
      await new Promise(resolve => setTimeout(resolve, 2000));

      setProgress(100);
      setExportStatus("completed");
      
      // Get the URL from response
      const videoUrl = response.data?.videoOutputUrl || response.data?.video_output?.final_video_url;
      setExportedUrl(videoUrl);

      toast.success("Video exported successfully!");

    } catch (error) {
      console.error("Export error:", error);
      setExportStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to export video");
      toast.error("Export failed", { 
        description: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  };

  const handleDownload = () => {
    if (exportedUrl) {
      window.open(exportedUrl, '_blank');
    } else {
      // Create a placeholder download for demo
      toast.info("Video URL will be available when assembly is complete");
    }
  };

  const resetExport = () => {
    setExportStatus("idle");
    setProgress(0);
    setExportedUrl(null);
    setErrorMessage(null);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetExport();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Download className="w-5 h-5 text-primary" />
            Export Video
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Assemble and download your final video with {scenesCount} scenes
          </DialogDescription>
        </DialogHeader>

        {exportStatus === "idle" ? (
          <div className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-foreground">Output Format</Label>
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                {formatOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      format === option.value 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setFormat(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <Label htmlFor={option.value} className="font-medium cursor-pointer">
                          {option.label}
                        </Label>
                        {option.recommended && (
                          <Badge variant="secondary" className="text-xs">Recommended</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator className="bg-border" />

            {/* Options */}
            <div className="space-y-4">
              <Label className="text-foreground">Options</Label>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Subtitles className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Add Subtitles</p>
                    <p className="text-sm text-muted-foreground">Burn captions into video</p>
                  </div>
                </div>
                <Switch checked={addSubtitles} onCheckedChange={setAddSubtitles} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Add Watermark</p>
                    <p className="text-sm text-muted-foreground">Include brand watermark</p>
                  </div>
                </div>
                <Switch checked={addWatermark} onCheckedChange={setAddWatermark} />
              </div>
            </div>

            <Button 
              onClick={handleExport} 
              className="w-full bg-gradient-primary text-primary-foreground"
            >
              <Download className="w-4 h-4 mr-2" />
              Start Export
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Progress */}
            <div className="text-center space-y-4">
              {exportStatus === "completed" ? (
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              ) : exportStatus === "error" ? (
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              )}
              
              <div>
                <p className="font-medium text-foreground text-lg">
                  {statusMessages[exportStatus]}
                </p>
                {errorMessage && (
                  <p className="text-sm text-destructive mt-1">{errorMessage}</p>
                )}
              </div>
            </div>

            {exportStatus !== "completed" && exportStatus !== "error" && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">{progress}%</p>
              </div>
            )}

            {/* Export Details */}
            {exportStatus === "completed" && (
              <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-medium text-foreground">{format.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtitles</span>
                  <span className="font-medium text-foreground">{addSubtitles ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Scenes</span>
                  <span className="font-medium text-foreground">{scenesCount}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {exportStatus === "completed" ? (
                <>
                  <Button variant="outline" onClick={resetExport} className="flex-1">
                    Export Another
                  </Button>
                  <Button onClick={handleDownload} className="flex-1 bg-gradient-primary text-primary-foreground">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </>
              ) : exportStatus === "error" ? (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleExport} className="flex-1">
                    Retry
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
