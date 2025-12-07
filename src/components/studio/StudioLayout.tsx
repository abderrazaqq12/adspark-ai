import { ReactNode, useState } from 'react';
import { Settings, ChevronRight, Sheet, RefreshCw, ArrowLeft, Package, Cpu, Layers } from 'lucide-react';
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
  { id: 'input' as const, number: 1, title: 'Product Input', description: 'Product details & content', icon: Package },
  { id: 'processing' as const, number: 2, title: 'AI Orchestration', description: 'Content generation', icon: Cpu },
  { id: 'assets' as const, number: 3, title: 'Asset Builder', description: 'Media generation', icon: Layers },
];

export const StudioLayout = ({ children, activeLayer, onLayerChange }: StudioLayoutProps) => {
  const [rowNumber, setRowNumber] = useState('1');
  const [status, setStatus] = useState<string>('Ready_to_start');
  const navigate = useNavigate();

  const LayerButton = ({ layer }: { layer: { id: WorkflowLayer; number: number; title: string; description: string; icon: any } }) => {
    const Icon = layer.icon;
    return (
      <button
        onClick={() => onLayerChange(layer.id)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
          activeLayer === layer.id
            ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-lg border border-primary/30'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/50 border border-transparent'
        }`}
      >
        <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          activeLayer === layer.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="flex-1 text-left">
          <p className="font-semibold text-sm">{layer.title}</p>
          <p className="text-xs text-muted-foreground">{layer.description}</p>
        </div>
        <ChevronRight className={`w-4 h-4 ${activeLayer === layer.id ? 'text-primary' : 'text-muted-foreground'}`} />
      </button>
    );
  };

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
              className="h-9 w-9 shrink-0 hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-sidebar-foreground">FlowScale Studio</h1>
                <p className="text-[10px] text-muted-foreground">Advanced Video Creation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-muted-foreground px-1 mb-3 uppercase tracking-wider">
              Workflow Steps
            </p>
          </div>

          {workflowLayers.map((layer) => (
            <LayerButton key={layer.id} layer={layer} />
          ))}

          {/* Progress indicator */}
          <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">Progress</span>
              <span className="text-xs font-bold text-primary">
                {workflowLayers.findIndex(l => l.id === activeLayer) + 1} / {workflowLayers.length}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                style={{ 
                  width: `${((workflowLayers.findIndex(l => l.id === activeLayer) + 1) / workflowLayers.length) * 100}%` 
                }}
              />
            </div>
          </div>

          {/* Quick settings link */}
          <div className="mt-4 pt-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/settings')}
            >
              <Settings className="w-4 h-4 mr-2" />
              <span className="text-sm">Configure API Keys & Integrations</span>
            </Button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Google Sheet Row */}
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-2.5 border border-border">
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