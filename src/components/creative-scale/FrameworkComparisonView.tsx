/**
 * Framework Comparison View
 * Shows all 8 marketing frameworks with characteristics and when to use each
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Zap, 
  Target, 
  ArrowRight, 
  Clock,
  Layers,
  TrendingUp,
  Users,
  Video,
  Smartphone,
  Youtube,
  MessageCircle,
  LayoutGrid,
  ChevronRight,
  Scale
} from 'lucide-react';
import { FRAMEWORK_DEFINITIONS, PLATFORM_PREFERENCES, type ExtendedFrameworkType, type PlatformType } from '@/lib/creative-scale/marketing-frameworks';

interface FrameworkComparisonViewProps {
  onSelectFramework?: (framework: ExtendedFrameworkType) => void;
  compact?: boolean;
}

export function FrameworkComparisonView({ onSelectFramework, compact = false }: FrameworkComparisonViewProps) {
  const [selectedFramework, setSelectedFramework] = useState<ExtendedFrameworkType | null>(null);
  const frameworks = Object.values(FRAMEWORK_DEFINITIONS);

  if (compact) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <LayoutGrid className="w-4 h-4 mr-2" />
            Compare Frameworks
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              Marketing Framework Comparison
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh] pr-4">
            <FrameworkGrid 
              frameworks={frameworks} 
              selectedFramework={selectedFramework}
              onSelect={(fw) => {
                setSelectedFramework(fw);
                onSelectFramework?.(fw);
              }}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" />
          Marketing Frameworks
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          8 proven ad frameworks — each optimized for different goals and platforms
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="grid grid-cols-2 w-[200px] mb-4">
            <TabsTrigger value="grid" className="text-xs">Grid View</TabsTrigger>
            <TabsTrigger value="compare" className="text-xs">Compare</TabsTrigger>
          </TabsList>

          <TabsContent value="grid">
            <ScrollArea className="h-[500px] pr-2">
              <FrameworkGrid 
                frameworks={frameworks}
                selectedFramework={selectedFramework}
                onSelect={(fw) => {
                  setSelectedFramework(fw);
                  onSelectFramework?.(fw);
                }}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="compare">
            <ScrollArea className="h-[500px]">
              <ComparisonTable frameworks={frameworks} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface FrameworkGridProps {
  frameworks: typeof FRAMEWORK_DEFINITIONS[ExtendedFrameworkType][];
  selectedFramework: ExtendedFrameworkType | null;
  onSelect: (fw: ExtendedFrameworkType) => void;
}

function FrameworkGrid({ frameworks, selectedFramework, onSelect }: FrameworkGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {frameworks.map((fw) => (
        <FrameworkCard 
          key={fw.id} 
          framework={fw} 
          isSelected={selectedFramework === fw.id}
          onSelect={() => onSelect(fw.id)}
        />
      ))}
    </div>
  );
}

interface FrameworkCardProps {
  framework: typeof FRAMEWORK_DEFINITIONS[ExtendedFrameworkType];
  isSelected: boolean;
  onSelect: () => void;
}

function FrameworkCard({ framework, isSelected, onSelect }: FrameworkCardProps) {
  const hookColor = {
    low: 'text-blue-500 bg-blue-500/10',
    medium: 'text-amber-500 bg-amber-500/10',
    high: 'text-red-500 bg-red-500/10'
  }[framework.hookAggressiveness];

  const pacingColor = {
    slow: 'text-blue-500',
    medium: 'text-amber-500',
    fast: 'text-green-500'
  }[framework.idealPacing];

  return (
    <Card 
      className={`cursor-pointer transition-all hover:border-primary/50 ${
        isSelected ? 'border-primary ring-2 ring-primary/20' : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {framework.shortName}
              </Badge>
              {isSelected && (
                <Badge className="text-[10px]">Selected</Badge>
              )}
            </div>
            <h4 className="font-medium text-sm mt-1">{framework.name}</h4>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground mb-3">
          {framework.description}
        </p>

        {/* Segment Flow */}
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {framework.segmentOrder.map((segment, idx) => (
            <div key={segment} className="flex items-center">
              <Badge variant="outline" className="text-[10px] capitalize">
                {segment.replace('_', ' ')}
              </Badge>
              {idx < framework.segmentOrder.length - 1 && (
                <ChevronRight className="w-3 h-3 text-muted-foreground mx-0.5" />
              )}
            </div>
          ))}
        </div>

        {/* Characteristics */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className={`p-2 rounded text-center ${hookColor}`}>
            <Zap className="w-3 h-3 mx-auto mb-1" />
            <div className="text-[10px] capitalize">{framework.hookAggressiveness}</div>
            <div className="text-[8px] text-muted-foreground">Hook</div>
          </div>
          <div className="p-2 rounded bg-muted/50 text-center">
            <Clock className={`w-3 h-3 mx-auto mb-1 ${pacingColor}`} />
            <div className="text-[10px] capitalize">{framework.idealPacing}</div>
            <div className="text-[8px] text-muted-foreground">Pacing</div>
          </div>
          <div className="p-2 rounded bg-muted/50 text-center">
            <Target className="w-3 h-3 mx-auto mb-1 text-primary" />
            <div className="text-[10px] capitalize">{framework.ctaPlacement}</div>
            <div className="text-[8px] text-muted-foreground">CTA</div>
          </div>
        </div>

        {/* Best For */}
        <div className="mb-3">
          <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
            <Users className="w-3 h-3" /> Best For:
          </div>
          <div className="flex flex-wrap gap-1">
            {framework.bestFor.slice(0, 3).map((use) => (
              <Badge key={use} variant="outline" className="text-[10px]">
                {use}
              </Badge>
            ))}
          </div>
        </div>

        {/* Platforms */}
        <div className="mb-3">
          <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
            <Video className="w-3 h-3" /> Platforms:
          </div>
          <div className="flex gap-1">
            {framework.platforms.map((platform) => (
              <PlatformIcon key={platform} platform={platform} />
            ))}
          </div>
        </div>

        {/* Hormozi Alignment */}
        <div className="p-2 rounded bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-1 text-[10px] text-primary font-medium mb-1">
            <Scale className="w-3 h-3" />
            Value Equation Alignment
          </div>
          <p className="text-[10px] text-muted-foreground">
            {framework.hormoziAlignment}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformIcon({ platform }: { platform: PlatformType }) {
  const iconMap: Record<PlatformType, { icon: React.ReactNode; label: string }> = {
    tiktok: { icon: <Smartphone className="w-3 h-3" />, label: 'TikTok' },
    reels: { icon: <Video className="w-3 h-3" />, label: 'Reels' },
    snapchat: { icon: <MessageCircle className="w-3 h-3" />, label: 'Snap' },
    youtube: { icon: <Youtube className="w-3 h-3" />, label: 'YouTube' },
    facebook: { icon: <Users className="w-3 h-3" />, label: 'FB' },
    general: { icon: <LayoutGrid className="w-3 h-3" />, label: 'All' }
  };

  const { icon, label } = iconMap[platform];

  return (
    <Badge variant="secondary" className="text-[10px] gap-1">
      {icon}
      {label}
    </Badge>
  );
}

interface ComparisonTableProps {
  frameworks: typeof FRAMEWORK_DEFINITIONS[ExtendedFrameworkType][];
}

function ComparisonTable({ frameworks }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 font-medium">Framework</th>
            <th className="text-center p-2 font-medium">Hook</th>
            <th className="text-center p-2 font-medium">Pacing</th>
            <th className="text-center p-2 font-medium">CTA</th>
            <th className="text-left p-2 font-medium">Best For</th>
            <th className="text-left p-2 font-medium">Platforms</th>
          </tr>
        </thead>
        <tbody>
          {frameworks.map((fw) => (
            <tr key={fw.id} className="border-b hover:bg-muted/50">
              <td className="p-2">
                <div className="font-medium">{fw.shortName}</div>
                <div className="text-muted-foreground text-[10px]">{fw.name}</div>
              </td>
              <td className="p-2 text-center">
                <Badge 
                  variant={fw.hookAggressiveness === 'high' ? 'destructive' : 'secondary'}
                  className="text-[10px]"
                >
                  {fw.hookAggressiveness}
                </Badge>
              </td>
              <td className="p-2 text-center">
                <Badge variant="outline" className="text-[10px]">
                  {fw.idealPacing}
                </Badge>
              </td>
              <td className="p-2 text-center">
                <Badge variant="outline" className="text-[10px]">
                  {fw.ctaPlacement}
                </Badge>
              </td>
              <td className="p-2">
                <div className="flex flex-wrap gap-1">
                  {fw.bestFor.slice(0, 2).map((use) => (
                    <span key={use} className="text-[10px] text-muted-foreground">
                      {use}
                    </span>
                  ))}
                </div>
              </td>
              <td className="p-2">
                <div className="flex gap-1">
                  {fw.platforms.slice(0, 3).map((p) => (
                    <Badge key={p} variant="secondary" className="text-[10px]">
                      {p}
                    </Badge>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
