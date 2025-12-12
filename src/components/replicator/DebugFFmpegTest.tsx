import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Terminal } from "lucide-react";
import { EngineRouter } from "@/lib/video-engines/EngineRouter";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "error" | "success";
}

export function DebugFFmpegTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isolationStatus, setIsolationStatus] = useState<boolean>(false);

  useEffect(() => {
    // Check Cross-Origin Isolation (Required for SharedArrayBuffer)
    const isIsolated = window.crossOriginIsolated;
    setIsolationStatus(isIsolated);
    addLog(isIsolated ? "Cross-Origin Isolated: YES (Ready for WASM)" : "Cross-Origin Isolated: NO (WASM may fail)", isIsolated ? "success" : "error");
  }, []);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      message,
      type
    }]);
  };

  const runTest = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([]); // Clear previous logs
    addLog("Starting Client-Side FFmpeg Test...", "info");

    try {
      // 1. Get Engine
      addLog("Requesting 'free' tier engine from Router...", "info");
      const engine = EngineRouter.getEngine("free");
      addLog(`Engine Initialized: ${engine.name}`, "success");

      // 2. Initialize (Load WASM)
      addLog("Loading FFmpeg Core (WASM)...", "info");
      await engine.initialize();
      addLog("FFmpeg Core Loaded Successfully!", "success");

      // 3. Create Dummy Task
      addLog("Engine is ready for processing.", "success");

    } catch (err: any) {
      console.error("Test Failed:", err);
      addLog(`Error: ${err.message}`, "error");

      if (err.message?.includes("SharedArrayBuffer")) {
        addLog("CRITICAL: SharedArrayBuffer is missing. Check 'vite.config.ts' headers.", "error");
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-blue-500/50 bg-blue-500/5 mt-8">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Terminal className="w-5 h-5 text-blue-500" />
          Debug: Client-Side FFmpeg Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border">
          <div className="space-y-1">
            <p className="text-sm font-medium">System Status</p>
            <div className="flex items-center gap-2">
              <Badge variant={isolationStatus ? "default" : "destructive"} className={isolationStatus ? "bg-green-600" : ""}>
                {isolationStatus ? "COOP/COEP Active" : "Missing Headers"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {isolationStatus ? "Browser environment is secure for WASM" : "ffmpeg.wasm requires Cross-Origin isolation"}
              </span>
            </div>
          </div>
          <Button
            onClick={runTest}
            disabled={isRunning}
            variant="outline"
            className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Initialize Engine
              </>
            )}
          </Button>
        </div>

        {/* Logs */}
        <div className="h-48 overflow-y-auto bg-black/90 rounded-md p-3 font-mono text-xs space-y-1">
          {logs.length === 0 && <span className="text-muted-foreground/50">waiting for test...</span>}
          {logs.map((log, i) => (
            <div key={i} className={`flex gap-2 ${log.type === "error" ? "text-red-400" :
                log.type === "success" ? "text-green-400" :
                  "text-blue-200"
              }`}>
              <span className="opacity-50">[{log.time}]</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
