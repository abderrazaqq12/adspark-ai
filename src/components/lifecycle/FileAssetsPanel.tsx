import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  RefreshCw, 
  File,
  Image,
  Video,
  FileText,
  Clock,
  Trash2,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useLifecycleManagement, type FileAsset, type FileType } from '@/hooks/useLifecycleManagement';
import { formatDistanceToNow } from 'date-fns';

interface FileAssetsPanelProps {
  projectId?: string;
  jobId?: string;
  maxHeight?: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string | null, fileName: string) {
  if (mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
    return <Image className="h-4 w-4 text-purple-500" />;
  }
  if (mimeType?.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(fileName)) {
    return <Video className="h-4 w-4 text-blue-500" />;
  }
  if (mimeType?.startsWith('text/') || /\.(txt|md|json)$/i.test(fileName)) {
    return <FileText className="h-4 w-4 text-green-500" />;
  }
  return <File className="h-4 w-4 text-muted-foreground" />;
}

const fileTypeColors: Record<FileType, string> = {
  upload: 'bg-blue-500/10 text-blue-500',
  temp: 'bg-amber-500/10 text-amber-500',
  output: 'bg-purple-500/10 text-purple-500',
  final: 'bg-green-500/10 text-green-500'
};

export function FileAssetsPanel({ 
  projectId, 
  jobId,
  maxHeight = '400px' 
}: FileAssetsPanelProps) {
  const { getFileAssets, executeCleanup, isLoading: isCleanupLoading } = useLifecycleManagement();
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<FileType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'pending_deletion' | 'deleted' | 'all'>('active');

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const data = await getFileAssets({
        projectId,
        jobId,
        fileType: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      setFiles(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [projectId, jobId, typeFilter, statusFilter]);

  const totalSize = files.reduce((sum, f) => sum + (f.fileSize || 0), 0);
  const activeCount = files.filter(f => f.status === 'active').length;
  const expiringSoonCount = files.filter(f => {
    if (!f.expiresAt) return false;
    const hoursUntilExpiry = (new Date(f.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilExpiry > 0 && hoursUntilExpiry < 24;
  }).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">File Assets</CardTitle>
            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
              <span>{activeCount} active</span>
              <span>{formatBytes(totalSize)} total</span>
              {expiringSoonCount > 0 && (
                <span className="text-amber-500">{expiringSoonCount} expiring soon</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select 
              value={typeFilter} 
              onValueChange={(v) => setTypeFilter(v as FileType | 'all')}
            >
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="upload">Upload</SelectItem>
                <SelectItem value="temp">Temp</SelectItem>
                <SelectItem value="output">Output</SelectItem>
                <SelectItem value="final">Final</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={loadFiles}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ height: maxHeight }}>
          {files.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No files found
            </div>
          ) : (
            <div className="space-y-2">
              {files.map(file => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-2 rounded border bg-card hover:bg-muted/50 transition-colors"
                >
                  {getFileIcon(file.mimeType, file.fileName)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm truncate font-medium">
                        {file.fileName}
                      </span>
                      {file.fileUrl && (
                        <a 
                          href={file.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge 
                        variant="secondary" 
                        className={`text-[10px] px-1 py-0 ${fileTypeColors[file.fileType]}`}
                      >
                        {file.fileType}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {file.tool}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatBytes(file.fileSize)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-[10px] text-muted-foreground">
                    <div>{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</div>
                    {file.expiresAt && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Clock className="h-3 w-3" />
                        expires {formatDistanceToNow(new Date(file.expiresAt), { addSuffix: true })}
                      </div>
                    )}
                  </div>

                  {file.status === 'pending_deletion' && (
                    <Badge variant="destructive" className="text-[10px]">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
