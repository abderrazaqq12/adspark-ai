import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Terminal, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { EngineRouter } from "@/lib/video-engines/EngineRouter";
import { checkCOIStatus, ensureCrossOriginIsolation, getCOIStatusMessage } from "@/lib/video-engines/coi-helper";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "error" | "success";
}

export function DebugFFmpegTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [isEnablingCOI, setIsEnablingCOI] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [coiStatus, setCoiStatus] = useState(() => checkCOIStatus());

  useEffect(() => {
    // Check COI status on mount
    const status = checkCOIStatus();
    setCoiStatus(status);
    
    const message = status.isIsolated 
      ? "Cross-Origin Isolated: YES (Ready for WASM)" 
      : "Cross-Origin Isolated: NO (WASM may fail)";
    
    addLog(message, status.isIsolated ? "success" : "error");
    
    if (status.serviceWorkerActive) {
      addLog("Service Worker: Active", "success");
    }
  }, []);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      message,
      type
    }]);
  };

  const enableCrossOriginIsolation = async () => {
    setIsEnablingCOI(true);
    addLog("Registering Cross-Origin Isolation service worker...", "info");
    
    try {
      const success = await ensureCrossOriginIsolation();
      if (success) {
        addLog("Already cross-origin isolated!", "success");
        setCoiStatus(checkCOIStatus());
      }
      // If not success, page will reload automatically
    } catch (err: any) {
      addLog(`Failed to enable COI: ${err.message}`, "error");
    } finally {
      setIsEnablingCOI(false);
    }
  };

  const runTest = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([]); // Clear previous logs
    
    // Re-check status
    const status = checkCOIStatus();
    setCoiStatus(status);
    
    addLog("Starting Client-Side FFmpeg Test...", "info");
    addLog(`Cross-Origin Isolated: ${status.isIsolated ? 'YES' : 'NO'}`, status.isIsolated ? "success" : "error");
    addLog(`SharedArrayBuffer: ${status.hasSharedArrayBuffer ? 'Available' : 'Missing'}`, status.hasSharedArrayBuffer ? "success" : "error");

    try {
      // Check engine status
      const engineStatus = EngineRouter.getBrowserEngineStatus();
      addLog(`FFmpeg Available: ${engineStatus.ffmpegAvailable}`, engineStatus.ffmpegAvailable ? "success" : "info");
      addLog(`WebCodecs Available: ${engineStatus.webCodecsAvailable}`, engineStatus.webCodecsAvailable ? "success" : "info");
      
      if (!engineStatus.ffmpegAvailable && engineStatus.reason) {
        addLog(`FFmpeg unavailable reason: ${engineStatus.reason}`, "error");
      }

      // Get and initialize engine
      addLog("Requesting 'free' tier engine from Router...", "info");
      EngineRouter.clearCache(); // Clear cache to get fresh instance
      const engine = EngineRouter.getEngine("free");
      addLog(`Engine Selected: ${engine.name}`, "success");

      // Initialize (Load WASM if FFmpeg)
      addLog("Initializing engine (loading WASM if FFmpeg)...", "info");
      await engine.initialize();
      addLog("Engine Initialized Successfully!", "success");

      addLog("Engine is ready for processing.", "success");

    } catch (err: any) {
      console.error("Test Failed:", err);
      addLog(`Error: ${err.message}`, "error");

      if (err.message?.includes("SharedArrayBuffer") || err.message?.includes("Cross-Origin")) {
        addLog("SOLUTION: Click 'Enable Cross-Origin Isolation' button above", "info");
      }
    } finally {
      setIsRunning(false);
    }
  };

  const isReady = coiStatus.isIsolated && coiStatus.hasSharedArrayBuffer;

  return (
    <Card className="border-blue-500/50 bg-blue-500/5 mt-8">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Terminal className="w-5 h-5 text-blue-500" />
          Debug: Client-Side FFmpeg Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Panel */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-background/50 rounded-lg border border-border">
          <div className="space-y-2">
            <p className="text-sm font-medium">System Status</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge 
                variant={coiStatus.isIsolated ? "default" : "destructive"} 
                className={coiStatus.isIsolated ? "bg-green-600" : ""}
              >
                {coiStatus.isIsolated ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" /> COOP/COEP Active</>
                ) : (
                  <><XCircle className="w-3 h-3 mr-1" /> Missing Headers</>
                )}
              </Badge>
              {coiStatus.serviceWorkerActive && (
                <Badge variant="outline" className="text-blue-400 border-blue-400/50">
                  SW Active
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {getCOIStatusMessage()}
            </p>
          </div>
          
          <div className="flex flex-col gap-2 items-end justify-center">
            {!coiStatus.isIsolated && (
              <Button
                onClick={enableCrossOriginIsolation}
                disabled={isEnablingCOI}
                variant="default"
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isEnablingCOI ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enabling...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Enable Cross-Origin Isolation</>
                )}
              </Button>
            )}
            <Button
              onClick={runTest}
              disabled={isRunning}
              variant="outline"
              size="sm"
              className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
            >
              {isRunning ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Initializing...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Initialize Engine</>
              )}
            </Button>
          </div>
        </div>

        {/* Logs */}
        <div className="h-48 overflow-y-auto bg-black/90 rounded-md p-3 font-mono text-xs space-y-1">
          {logs.length === 0 && (
            <span className="text-muted-foreground/50">
              {isReady ? "Ready. Click 'Initialize Engine' to test." : "Click 'Enable Cross-Origin Isolation' to begin."}
            </span>
          )}
          {logs.map((log, i) => (
            <div 
              key={i} 
              className={`flex gap-2 ${
                log.type === "error" ? "text-red-400" :
                log.type === "success" ? "text-green-400" :
                "text-blue-200"
              }`}
            >
              <span className="opacity-50">[{log.time}]</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
