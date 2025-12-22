import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trash2, 
  RefreshCw, 
  FileX, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  HardDrive,
  FileText,
  Zap
} from 'lucide-react';
import { useLifecycleManagement, type CleanupType, type CleanupPreview, type CleanupHistoryEntry } from '@/hooks/useLifecycleManagement';
import { formatDistanceToNow } from 'date-fns';

interface CleanupManagerProps {
  projectId?: string;
  variant?: 'full' | 'compact';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function CleanupManager({ projectId, variant = 'full' }: CleanupManagerProps) {
  const {
    isLoading,
    isPreviewLoading,
    getCleanupPreview,
    executeCleanup,
    runRecovery,
    getCleanupHistory
  } = useLifecycleManagement();

  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [history, setHistory] = useState<CleanupHistoryEntry[]>([]);
  const [selectedType, setSelectedType] = useState<CleanupType>('project');
  const [options, setOptions] = useState({
    deleteFiles: true,
    deleteLogs: true,
    updateJobs: true
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await getCleanupHistory(10);
    setHistory(data);
  };

  const handlePreview = async (type: CleanupType) => {
    setSelectedType(type);
    const data = await getCleanupPreview(type, type === 'project' ? projectId : undefined);
    setPreview(data);
  };

  const handleCleanup = async () => {
    const result = await executeCleanup(
      selectedType,
      selectedType === 'project' ? projectId : undefined,
      options
    );
    if (result) {
      setPreview(null);
      loadHistory();
    }
  };

  const handleRecovery = async () => {
    await runRecovery('user');
    loadHistory();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (variant === 'compact') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Lifecycle Cleanup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handlePreview('expired')}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Expired
                </Button>
              </AlertDialogTrigger>
              <CleanupConfirmDialog
                preview={preview}
                isLoading={isLoading}
                isPreviewLoading={isPreviewLoading}
                options={options}
                setOptions={setOptions}
                onConfirm={handleCleanup}
                type="expired"
              />
            </AlertDialog>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handlePreview('orphaned')}
                >
                  <FileX className="h-3 w-3 mr-1" />
                  Orphaned
                </Button>
              </AlertDialogTrigger>
              <CleanupConfirmDialog
                preview={preview}
                isLoading={isLoading}
                isPreviewLoading={isPreviewLoading}
                options={options}
                setOptions={setOptions}
                onConfirm={handleCleanup}
                type="orphaned"
              />
            </AlertDialog>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full"
            onClick={handleRecovery}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Run Recovery
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Lifecycle Management
          </CardTitle>
          <CardDescription>
            Manage files, logs, and jobs across the platform. Clean up expired content and recover stale jobs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cleanup" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
              <TabsTrigger value="recovery">Recovery</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="cleanup" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {projectId && (
                  <CleanupButton
                    type="project"
                    icon={<HardDrive className="h-4 w-4" />}
                    label="Project Files"
                    description="Clean up this project"
                    onClick={() => handlePreview('project')}
                    isLoading={isPreviewLoading && selectedType === 'project'}
                  />
                )}
                <CleanupButton
                  type="expired"
                  icon={<Clock className="h-4 w-4" />}
                  label="Expired Files"
                  description="Remove expired content"
                  onClick={() => handlePreview('expired')}
                  isLoading={isPreviewLoading && selectedType === 'expired'}
                />
                <CleanupButton
                  type="orphaned"
                  icon={<FileX className="h-4 w-4" />}
                  label="Orphaned Files"
                  description="Clean orphaned temp files"
                  onClick={() => handlePreview('orphaned')}
                  isLoading={isPreviewLoading && selectedType === 'orphaned'}
                />
                <CleanupButton
                  type="user"
                  icon={<Trash2 className="h-4 w-4" />}
                  label="All My Data"
                  description="Full account cleanup"
                  onClick={() => handlePreview('user')}
                  isLoading={isPreviewLoading && selectedType === 'user'}
                  variant="destructive"
                />
              </div>

              {preview && (
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Cleanup Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{preview.filesCount}</div>
                        <div className="text-xs text-muted-foreground">Files</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{preview.logsCount}</div>
                        <div className="text-xs text-muted-foreground">Logs</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{preview.jobsCount}</div>
                        <div className="text-xs text-muted-foreground">Jobs</div>
                      </div>
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                      Estimated space freed: <span className="font-medium">{formatBytes(preview.estimatedBytesFreed)}</span>
                    </div>

                    {preview.files.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">Files to be deleted:</div>
                          <ScrollArea className="h-32">
                            <div className="space-y-1">
                              {preview.files.map(file => (
                                <div key={file.id} className="flex items-center justify-between text-xs">
                                  <span className="truncate flex-1">{file.name}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px]">{file.type}</Badge>
                                    <span className="text-muted-foreground">{formatBytes(file.size)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Options:</div>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={options.deleteFiles}
                            onCheckedChange={(checked) => 
                              setOptions(prev => ({ ...prev, deleteFiles: checked === true }))
                            }
                          />
                          Delete files
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={options.deleteLogs}
                            onCheckedChange={(checked) => 
                              setOptions(prev => ({ ...prev, deleteLogs: checked === true }))
                            }
                          />
                          Delete logs
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={options.updateJobs}
                            onCheckedChange={(checked) => 
                              setOptions(prev => ({ ...prev, updateJobs: checked === true }))
                            }
                          />
                          Cancel pending jobs
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setPreview(null)}
                      >
                        Cancel
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            className="flex-1"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Execute Cleanup
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              Confirm Cleanup
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete {preview.filesCount} files and {preview.logsCount} logs.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCleanup}>
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="recovery" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Job Recovery
                  </CardTitle>
                  <CardDescription>
                    Detect and recover stale jobs, mark expired files, and clean up orphaned resources.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>The recovery process will:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Timeout jobs stuck in "queued" state for more than 2 hours</li>
                      <li>Timeout jobs stuck in "running" state for more than 4 hours</li>
                      <li>Mark expired files for deletion</li>
                      <li>Delete expired log entries</li>
                      <li>Clean up pending deletion files</li>
                    </ul>
                  </div>
                  
                  <Button 
                    onClick={handleRecovery} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Run Recovery Process
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-4">
              <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No cleanup history yet
                  </div>
                ) : (
                  history.map(entry => (
                    <Card key={entry.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(entry.status)}
                          <div>
                            <div className="text-sm font-medium capitalize">
                              {entry.cleanupType} cleanup
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(entry.startedAt), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <div>{entry.filesDeleted} files</div>
                          <div>{entry.logsDeleted} logs</div>
                          <div className="text-muted-foreground">{formatBytes(entry.bytesFreed)}</div>
                        </div>
                      </div>
                      {entry.errorMessage && (
                        <div className="mt-2 text-xs text-destructive">
                          {entry.errorMessage}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadHistory}
                className="w-full"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Refresh History
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface CleanupButtonProps {
  type: CleanupType;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  isLoading?: boolean;
  variant?: 'default' | 'destructive';
}

function CleanupButton({ icon, label, description, onClick, isLoading, variant = 'default' }: CleanupButtonProps) {
  return (
    <Button
      variant={variant === 'destructive' ? 'destructive' : 'outline'}
      className="h-auto py-4 flex-col gap-2"
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      <div className="text-xs font-medium">{label}</div>
      <div className="text-[10px] text-muted-foreground font-normal">{description}</div>
    </Button>
  );
}

interface CleanupConfirmDialogProps {
  preview: CleanupPreview | null;
  isLoading: boolean;
  isPreviewLoading: boolean;
  options: { deleteFiles: boolean; deleteLogs: boolean; updateJobs: boolean };
  setOptions: React.Dispatch<React.SetStateAction<{ deleteFiles: boolean; deleteLogs: boolean; updateJobs: boolean }>>;
  onConfirm: () => void;
  type: CleanupType;
}

function CleanupConfirmDialog({ 
  preview, 
  isLoading, 
  isPreviewLoading, 
  options, 
  setOptions, 
  onConfirm,
  type 
}: CleanupConfirmDialogProps) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          {type === 'expired' ? 'Clean Expired Files' : 'Clean Orphaned Files'}
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-4">
            {isPreviewLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : preview ? (
              <>
                <p>This will permanently delete:</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted rounded p-2">
                    <div className="text-lg font-bold">{preview.filesCount}</div>
                    <div className="text-xs">Files</div>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <div className="text-lg font-bold">{preview.logsCount}</div>
                    <div className="text-xs">Logs</div>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <div className="text-lg font-bold">{formatBytes(preview.estimatedBytesFreed)}</div>
                    <div className="text-xs">Space</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={options.deleteFiles}
                      onCheckedChange={(checked) => 
                        setOptions(prev => ({ ...prev, deleteFiles: checked === true }))
                      }
                    />
                    Delete files
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={options.deleteLogs}
                      onCheckedChange={(checked) => 
                        setOptions(prev => ({ ...prev, deleteLogs: checked === true }))
                      }
                    />
                    Delete logs
                  </label>
                </div>
              </>
            ) : (
              <p>Loading preview...</p>
            )}
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction 
          onClick={onConfirm}
          disabled={isLoading || !preview}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Delete Permanently
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
