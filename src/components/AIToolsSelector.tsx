// AI Tools Selector - Standalone Component
// Extends existing pipeline with new AI tools selection

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Video, 
  Image as ImageIcon, 
  User, 
  Wand2, 
  Layout, 
  CheckCircle2,
  Sparkles,
  Loader2,
  Info
} from 'lucide-react';
import { 
  extendedAIModelsRegistry, 
  ExtendedAIModel,
  getModelById 
} from '@/data/extendedAIModels';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface AIToolsSelectorProps {
  onToolSelect?: (tool: ExtendedAIModel) => void;
  onApplyTool?: (toolId: string, config: ToolConfig) => Promise<void>;
  selectedTools?: string[];
  context?: {
    productName?: string;
    productDescription?: string;
    language?: string;
    targetMarket?: string;
    audienceAge?: string;
    audienceGender?: string;
  };
  mode?: 'select' | 'apply';
}

interface ToolConfig {
  toolId: string;
  prompt?: string;
  language?: string;
  targetMarket?: string;
  audience?: {
    age?: string;
    gender?: string;
  };
  productContext?: {
    name?: string;
    description?: string;
  };
  additionalParams?: Record<string, any>;
}

const categoryIcons: Record<string, React.ElementType> = {
  video: Video,
  talking_actor: User,
  image: ImageIcon,
  preset: Layout,
  tool: Wand2,
};

const categoryLabels: Record<string, string> = {
  video: 'Video Models',
  talking_actor: 'Talking Actors',
  image: 'Image Models',
  preset: 'Presets',
  tool: 'AI Tools',
};

const tierColors: Record<string, string> = {
  free: 'bg-green-500/20 text-green-400 border-green-500/30',
  budget: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  standard: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  premium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

export const AIToolsSelector = ({
  onToolSelect,
  onApplyTool,
  selectedTools = [],
  context,
  mode = 'select',
}: AIToolsSelectorProps) => {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>('video');
  const [selected, setSelected] = useState<string[]>(selectedTools);
  const [applying, setApplying] = useState<string | null>(null);

  const handleSelect = (model: ExtendedAIModel) => {
    if (mode === 'select') {
      const newSelected = selected.includes(model.id)
        ? selected.filter(id => id !== model.id)
        : [...selected, model.id];
      setSelected(newSelected);
      onToolSelect?.(model);
    }
  };

  const handleApply = async (model: ExtendedAIModel) => {
    if (!onApplyTool) return;
    
    setApplying(model.id);
    try {
      const config: ToolConfig = {
        toolId: model.id,
        prompt: context?.productDescription || '',
        language: context?.language || 'en',
        targetMarket: context?.targetMarket || 'gcc',
        audience: {
          age: context?.audienceAge,
          gender: context?.audienceGender,
        },
        productContext: {
          name: context?.productName,
          description: context?.productDescription,
        },
      };
      
      await onApplyTool(model.id, config);
      
      toast({
        title: "Tool Applied",
        description: `${model.name} has been applied successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to apply tool",
        variant: "destructive",
      });
    } finally {
      setApplying(null);
    }
  };

  const renderModelCard = (model: ExtendedAIModel) => {
    const isSelected = selected.includes(model.id);
    const isApplying = applying === model.id;
    
    return (
      <Card 
        key={model.id}
        className={`cursor-pointer transition-all hover:border-primary/50 ${
          isSelected ? 'border-primary bg-primary/5' : 'border-border'
        }`}
        onClick={() => handleSelect(model)}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-medium">{model.name}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] ${tierColors[model.pricingTier]}`}>
                {model.pricingTier}
              </Badge>
              {isSelected && (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <CardDescription className="text-xs line-clamp-2">
            {model.description}
          </CardDescription>
          
          <div className="flex flex-wrap gap-1">
            {model.capabilities.slice(0, 3).map((cap) => (
              <Badge 
                key={cap} 
                variant="secondary" 
                className="text-[10px] bg-muted/50"
              >
                {cap}
              </Badge>
            ))}
            {model.capabilities.length > 3 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-[10px] bg-muted/50">
                      +{model.capabilities.length - 3}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      {model.capabilities.slice(3).join(', ')}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Info className="w-3 h-3" />
              {model.inputTypes.join(', ')} → {model.outputType}
            </div>
            
            {mode === 'apply' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApply(model);
                }}
                disabled={isApplying}
              >
                {isApplying ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Wand2 className="w-3 h-3 mr-1" />
                )}
                Apply
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-foreground">AI Tools & Models</CardTitle>
            <CardDescription className="text-muted-foreground">
              Select AI models and tools for your content generation
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-5 bg-muted">
            {Object.entries(categoryLabels).map(([key, label]) => {
              const Icon = categoryIcons[key];
              return (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  className="flex items-center gap-1 text-xs"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          {Object.entries(extendedAIModelsRegistry).map(([key, models]) => {
            const categoryKey = key === 'talkingActor' ? 'talking_actor' : 
                               key === 'presets' ? 'preset' : 
                               key === 'tools' ? 'tool' : key;
            return (
              <TabsContent key={key} value={categoryKey} className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {models.map(renderModelCard)}
                  </div>
                </ScrollArea>
              </TabsContent>
            );
          })}
        </Tabs>
        
        {selected.length > 0 && mode === 'select' && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selected.length} tool(s) selected
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelected([])}
                >
                  Clear
                </Button>
                <Button size="sm">
                  Apply Selected
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIToolsSelector;
