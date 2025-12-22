import { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Download, 
  ExternalLink, 
  Image as ImageIcon, 
  Video, 
  FileAudio, 
  FileText,
  Copy,
  CheckCircle2,
  FolderOpen,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface OutputResultPanelProps {
  outputUrl: string | null;
  outputType?: 'image' | 'video' | 'audio' | 'text';
  outputId?: string;
  isSuccess: boolean;
  assetId?: string;
  toolName?: string;
  onOpenInGallery?: () => void;
}

export function OutputResultPanel({ 
  outputUrl, 
  outputType,
  outputId,
  isSuccess,
  assetId,
  toolName,
  onOpenInGallery 
}: OutputResultPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Auto-scroll to output when result appears
  useEffect(() => {
    if (outputUrl && isSuccess && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [outputUrl, isSuccess]);

  // Detect output type from URL
  const detectOutputType = (): 'image' | 'video' | 'audio' | 'text' => {
    if (outputType) return outputType;
    if (!outputUrl) return 'image';
    
    const lowerUrl = outputUrl.toLowerCase();
    if (lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.mov') || lowerUrl.includes('video')) {
      return 'video';
    }
    if (lowerUrl.includes('.mp3') || lowerUrl.includes('.wav') || lowerUrl.includes('audio')) {
      return 'audio';
    }
    if (lowerUrl.includes('.txt') || lowerUrl.includes('.json')) {
      return 'text';
    }
    return 'image';
  };

  const type = detectOutputType();

  const getTypeIcon = () => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <FileAudio className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      default: return <ImageIcon className="w-4 h-4" />;
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'video': return 'Video Output';
      case 'audio': return 'Audio Output';
      case 'text': return 'Text Output';
      default: return 'Image Output';
    }
  };

  const getFilename = () => {
    if (outputId) return outputId;
    if (!outputUrl) return 'output';
    const parts = outputUrl.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('?')[0] || 'output';
  };

  const handleDownload = async () => {
    if (!outputUrl) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch(outputUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      // Fallback to opening in new tab
      window.open(outputUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyUrl = () => {
    if (!outputUrl) return;
    navigator.clipboard.writeText(outputUrl);
    setIsCopied(true);
    toast.success('URL copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenInGallery = () => {
    if (onOpenInGallery) {
      onOpenInGallery();
    } else {
      navigate('/gallery');
    }
  };

  // Empty state - waiting for execution
  if (!outputUrl && !isSuccess) {
    return (
      <Card ref={containerRef} className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Output
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center border-2 border-dashed border-border">
            <div className="text-center text-muted-foreground">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a tool and execute to see results</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      ref={containerRef} 
      className={`border-2 transition-all ${
        isSuccess 
          ? 'bg-green-500/5 border-green-500/30' 
          : 'bg-gradient-card border-border'
      }`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isSuccess && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            <Sparkles className="w-5 h-5 text-primary" />
            Output
            {toolName && <span className="text-sm font-normal text-muted-foreground">• {toolName}</span>}
          </span>
          <Badge variant="secondary" className="flex items-center gap-1">
            {getTypeIcon()}
            {getTypeLabel()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Output Preview */}
        <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
          {type === 'video' ? (
            <video 
              src={outputUrl || ''} 
              controls 
              className="w-full h-full object-contain bg-black"
              autoPlay={false}
            />
          ) : type === 'audio' ? (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="text-center space-y-3">
                <FileAudio className="w-12 h-12 mx-auto text-primary" />
                <audio src={outputUrl || ''} controls className="w-full max-w-xs" />
              </div>
            </div>
          ) : (
            <img 
              src={outputUrl || ''} 
              alt="Output" 
              className="w-full h-full object-contain"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiLz48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSIvPjxwYXRoIGQ9Im0yMSAxNS02LTYtOSA5Ii8+PC9zdmc+';
              }}
            />
          )}
          
          {/* Success overlay badge */}
          {isSuccess && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-green-500 text-white">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Ready
              </Badge>
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
          <span className="text-xs text-muted-foreground truncate max-w-[180px]" title={getFilename()}>
            {getFilename()}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={handleCopyUrl}
          >
            {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            {isDownloading ? '' : 'Download'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => outputUrl && window.open(outputUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Open
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full"
            onClick={handleOpenInGallery}
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            Gallery
          </Button>
        </div>
        
        {/* Asset saved indicator */}
        {assetId && (
          <div className="text-xs text-center text-green-600 bg-green-500/10 rounded py-1">
            ✓ Saved to Asset Gallery
          </div>
        )}
      </CardContent>
    </Card>
  );
}
