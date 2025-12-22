import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BatchQueueItem } from '@/components/ai-tools/BatchQueuePanel';
import { useToast } from '@/hooks/use-toast';
import { ImageOutputSettings, VideoOutputSettings } from '@/components/ai-tools/OutputControlsPanel';

interface BatchProcessingConfig {
  toolId: string;
  prompt?: string;
  language?: string;
  targetMarket?: string;
  imageSettings?: ImageOutputSettings;
  videoSettings?: VideoOutputSettings;
}

export function useBatchProcessing() {
  const { toast } = useToast();
  const [queue, setQueue] = useState<BatchQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedOutputs, setCompletedOutputs] = useState<string[]>([]);
  
  const pauseRef = useRef(false);
  const configRef = useRef<BatchProcessingConfig | null>(null);

  // Add files to queue
  const addToQueue = useCallback(async (files: File[]) => {
    const newItems: BatchQueueItem[] = [];
    
    for (const file of files) {
      // Upload file first
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) continue;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/batch/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const bucket = file.type.startsWith('video/') ? 'videos' : 'custom-scenes';
        
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, { cacheControl: '3600', upsert: false });
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
        
        newItems.push({
          id: crypto.randomUUID(),
          file,
          fileUrl: publicUrl,
          status: 'queued',
          progress: 0,
        });
      } catch (error) {
        console.error('Failed to upload file for batch:', file.name, error);
      }
    }
    
    setQueue(prev => [...prev, ...newItems]);
    toast({
      title: `${newItems.length} files added to queue`,
      description: 'Click Start to begin batch processing',
    });
  }, [toast]);

  // Remove item from queue
  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  // Reorder queue items (drag and drop)
  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue(prev => {
      const items = [...prev];
      const [movedItem] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, movedItem);
      return items;
    });
  }, []);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(0);
    setIsProcessing(false);
    setIsPaused(false);
    pauseRef.current = false;
    setCompletedOutputs([]);
  }, []);

  // Process a single item
  const processItem = async (item: BatchQueueItem, config: BatchProcessingConfig): Promise<BatchQueueItem> => {
    const startTime = new Date();
    
    // Update status to processing
    setQueue(prev => prev.map(i => 
      i.id === item.id ? { ...i, status: 'processing' as const, progress: 10, startTime } : i
    ));

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setQueue(prev => prev.map(i => 
          i.id === item.id && i.status === 'processing' 
            ? { ...i, progress: Math.min(i.progress + 15, 90) } 
            : i
        ));
      }, 500);

      const response = await supabase.functions.invoke('ai-tools', {
        body: {
          action: config.toolId,
          prompt: config.prompt,
          language: config.language || 'en',
          targetMarket: config.targetMarket || 'gcc',
          inputData: {
            imageUrl: item.fileUrl,
            videoUrl: item.fileUrl,
          },
          imageSettings: config.imageSettings,
          videoSettings: config.videoSettings,
        },
      });

      clearInterval(progressInterval);
      const endTime = new Date();

      if (response.error) {
        throw new Error(response.error.message);
      }

      const outputUrl = response.data?.outputUrl || response.data?.url || item.fileUrl;
      
      // Save to gallery
      const { data: { user } } = await supabase.auth.getUser();
      if (user && outputUrl) {
        await supabase.from('generated_images').insert({
          user_id: user.id,
          image_url: outputUrl,
          image_type: item.file.type.startsWith('video/') ? 'batch_video' : 'batch_image',
          prompt: `Batch: ${config.toolId}`,
          engine_name: response.data?.debug?.provider || 'AI Tools',
          status: 'completed',
          metadata: {
            batchId: item.id,
            originalFileName: item.file.name,
            toolId: config.toolId,
          },
        } as any);
      }

      return {
        ...item,
        status: 'completed',
        progress: 100,
        outputUrl,
        endTime,
      };
    } catch (error: any) {
      return {
        ...item,
        status: 'failed',
        progress: 0,
        error: error.message || 'Processing failed',
        endTime: new Date(),
      };
    }
  };

  // Start batch processing
  const startBatch = useCallback(async (config: BatchProcessingConfig) => {
    configRef.current = config;
    setIsProcessing(true);
    setIsPaused(false);
    pauseRef.current = false;

    // Find first queued item
    const startIdx = queue.findIndex(item => item.status === 'queued');
    if (startIdx === -1) {
      setIsProcessing(false);
      return;
    }

    for (let i = startIdx; i < queue.length; i++) {
      if (pauseRef.current) {
        setIsPaused(true);
        setIsProcessing(false);
        return;
      }

      const item = queue[i];
      if (item.status !== 'queued') continue;

      setCurrentIndex(i);
      const result = await processItem(item, config);
      
      setQueue(prev => prev.map(queueItem => 
        queueItem.id === item.id ? result : queueItem
      ));

      if (result.outputUrl) {
        setCompletedOutputs(prev => [...prev, result.outputUrl!]);
      }
    }

    setIsProcessing(false);
    toast({
      title: 'Batch processing complete',
      description: `Processed ${queue.length} files`,
    });
  }, [queue, toast]);

  // Pause batch processing
  const pauseBatch = useCallback(() => {
    pauseRef.current = true;
    setIsPaused(true);
  }, []);

  // Resume batch processing
  const resumeBatch = useCallback(() => {
    if (configRef.current) {
      startBatch(configRef.current);
    }
  }, [startBatch]);

  return {
    queue,
    isProcessing,
    isPaused,
    currentIndex,
    completedOutputs,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    startBatch,
    pauseBatch,
    resumeBatch,
  };
}
