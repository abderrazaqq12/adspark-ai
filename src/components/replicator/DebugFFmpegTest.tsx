import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, Play, Terminal, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DebugResult {
  success: boolean;
  step: string;
  error?: string;
  videoUrl?: string;
  ffmpegAvailable: boolean;
  executionTimeMs: number;
  logs: string[];
}

export function DebugFFmpegTest() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setVideoFile(file);
    
    // Upload to get URL
    const fileName = `debug-input/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from("videos")
      .upload(fileName, file, { upsert: true });
    
    if (error) {
      console.error("Upload error:", error);
      return;
    }
    
    const { data: urlData } = supabase.storage
      .from("videos")
      .getPublicUrl(fileName);
    
    setVideoUrl(urlData.publicUrl);
  };

  const runTest = async () => {
    if (!videoUrl) return;
    
    setIsRunning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("debug-ffmpeg-test", {
        body: { videoUrl },
      });

      if (error) {
        setResult({
          success: false,
          step: "invocation",
          error: error.message,
          ffmpegAvailable: false,
          executionTimeMs: 0,
          logs: [`Function invocation error: ${error.message}`],
        });
      } else {
        setResult(data as DebugResult);
      }
    } catch (err) {
      setResult({
        success: false,
        step: "client",
        error: err instanceof Error ? err.message : String(err),
        ffmpegAvailable: false,
        executionTimeMs: 0,
        logs: [`Client error: ${err}`],
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-orange-500/50 bg-orange-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Terminal className="w-5 h-5 text-orange-500" />
          Debug: Generate Single Video (FFMPEG Only)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          System validation test. Input 1 video → FFMPEG cuts 15s + zoom → Output 1 MP4.
          No placeholders. No fake success.
        </p>

        {/* File Input */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <Upload className="w-4 h-4" />
            <span className="text-sm">{videoFile ? videoFile.name : "Select Video"}</span>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <Button
            onClick={runTest}
            disabled={!videoUrl || isRunning}
            variant="outline"
            className="border-orange-500/50 text-orange-500"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </div>

        {videoUrl && (
          <div className="text-xs text-muted-foreground truncate">
            Input URL: {videoUrl}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-3 pt-3 border-t border-border/50">
            {/* Status */}
            <div className="flex items-center gap-3">
              {result.success ? (
                <Badge className="bg-green-500">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  SUCCESS
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  FAILED at {result.step}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {result.executionTimeMs}ms
              </span>
              <Badge variant="outline">
                FFMPEG: {result.ffmpegAvailable ? "Available" : "Blocked"}
              </Badge>
            </div>

            {/* Error */}
            {result.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                {result.error}
              </div>
            )}

            {/* Output Video */}
            {result.success && result.videoUrl && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-500">Output Video:</p>
                <video
                  src={result.videoUrl}
                  controls
                  className="w-full max-w-md rounded border border-border"
                />
                <a
                  href={result.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline"
                >
                  {result.videoUrl}
                </a>
              </div>
            )}

            {/* Logs */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Execution Logs:</p>
              <div className="max-h-40 overflow-y-auto bg-muted/30 rounded p-2 font-mono text-xs">
                {result.logs.map((log, i) => (
                  <div key={i} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
