import { ReactNode, useState } from 'react';
import { Settings, ChevronRight, Sheet, RefreshCw, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import type { WorkflowLayer } from '@/pages/Studio';

interface StudioLayoutProps {
  children: ReactNode;
  activeLayer: WorkflowLayer;
  onLayerChange: (layer: WorkflowLayer) => void;
}

const workflowLayers = [
  { id: 'input' as const, number: 1, title: 'Collect Input', description: 'Product link & description' },
  { id: 'hooks' as const, number: 2, title: 'Hooks', description: 'Webhook configuration' },
  { id: 'apikeys' as const, number: 3, title: 'API Keys', description: 'External services' },
  { id: 'googlesheet' as const, number: 4, title: 'Google Sheet', description: 'Data centralization' },
  { id: 'googledrive' as const, number: 5, title: 'Google Drive', description: 'Asset storage' },
];

const promptLayers = [
  { id: 'prompt1' as const, number: 6, title: 'AI Prompt 1', description: 'From Google Sheet' },
  { id: 'prompt2' as const, number: 7, title: 'AI Prompt 2', description: 'From Google Sheet' },
  { id: 'prompt3' as const, number: 8, title: 'AI Prompt 3', description: 'From Google Sheet' },
  { id: 'prompt4' as const, number: 9, title: 'AI Prompt 4', description: 'From Google Sheet' },
  { id: 'prompt5' as const, number: 10, title: 'AI Prompt 5', description: 'From Google Sheet' },
];

const processingLayers = [
  { id: 'processing' as const, number: 11, title: 'AI Orchestration', description: 'Content generation' },
  { id: 'assets' as const, number: 12, title: 'Asset Preview', description: 'Media generation' },
];

export const StudioLayout = ({ children, activeLayer, onLayerChange }: StudioLayoutProps) => {
  const [rowNumber, setRowNumber] = useState('1');
  const [status, setStatus] = useState<string>('Ready_to_start');
  const navigate = useNavigate();

  const LayerButton = ({ layer }: { layer: { id: WorkflowLayer; number: number; title: string; description: string } }) => (
    <button
      onClick={() => onLayerChange(layer.id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        activeLayer === layer.id
          ? 'bg-primary/20 text-primary shadow-md border border-primary/30'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
      }`}
    >
      <span className={`text-sm font-bold w-6 h-6 rounded-md flex items-center justify-center ${
        activeLayer === layer.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {layer.number}
      </span>
      <div className="flex-1 text-left">
        <p className="font-medium text-sm">{layer.title}</p>
        <p className="text-xs text-muted-foreground">{layer.description}</p>
      </div>
      <ChevronRight className={`w-4 h-4 ${activeLayer === layer.id ? 'text-primary' : 'text-muted-foreground'}`} />
    </button>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col overflow-y-auto">
        {/* Logo & Back */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="h-9 w-9 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-sidebar-foreground">FlowScale Studio</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">
              Workflow Layers
            </p>
          </div>

          {workflowLayers.map((layer) => (
            <LayerButton key={layer.id} layer={layer} />
          ))}

          <div className="my-3 mx-2">
            <div className="h-px bg-sidebar-border" />
          </div>

          <div className="mb-3">
            <p className="text-[10px] font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">
              AI Prompts
            </p>
          </div>

          {promptLayers.map((layer) => (
            <LayerButton key={layer.id} layer={layer} />
          ))}

          <div className="my-3 mx-2">
            <div className="h-px bg-sidebar-border" />
          </div>

          <div className="mb-3">
            <p className="text-[10px] font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">
              Processing & Assets
            </p>
          </div>

          {processingLayers.map((layer) => (
            <LayerButton key={layer.id} layer={layer} />
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Google Sheet Row */}
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-3 bg-sidebar rounded-lg p-2.5 border border-sidebar-border">
                <Sheet className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Sheet Row</p>
                  <Input
                    value={rowNumber}
                    onChange={(e) => setRowNumber(e.target.value)}
                    className="h-7 w-16 bg-background border-border text-primary font-mono font-bold text-sm"
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Status:</span>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-40 h-9 bg-background border-border text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under_maintenance">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-destructive"></span>
                        Under Maintenance
                      </span>
                    </SelectItem>
                    <SelectItem value="Ready_to_start">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Ready to Start
                      </span>
                    </SelectItem>
                    <SelectItem value="Finish">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Finish
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="sm" className="h-9">
                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                Check Status
              </Button>
            </div>

            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
