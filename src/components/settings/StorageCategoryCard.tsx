import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { StorageCategoryStats } from '@/types/storage';
import { 
  Video, Image, Music, FileText, Trash2, 
  Clock, AlertTriangle, HardDrive, Lock,
  FolderOpen, File
} from 'lucide-react';
import { format } from 'date-fns';

interface StorageCategoryCardProps {
  stats: StorageCategoryStats;
  isSelected: boolean;
  onToggle: (category: string) => void;
  disabled?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  generated_outputs: <Video className="h-5 w-5" />,
  temporary: <Trash2 className="h-5 w-5" />,
  logs: <FileText className="h-5 w-5" />,
  system: <Lock className="h-5 w-5" />,
};

const categoryColors: Record<string, string> = {
  generated_outputs: 'text-blue-500',
  temporary: 'text-amber-500',
  logs: 'text-purple-500',
  system: 'text-muted-foreground',
};

export function StorageCategoryCard({
  stats,
  isSelected,
  onToggle,
  disabled = false,
}: StorageCategoryCardProps) {
  const isSystem = stats.category === 'system';
  
  return (
    <Card 
      className={`transition-all ${
        isSystem 
          ? 'opacity-75 border-dashed' 
          : isSelected 
            ? 'border-primary ring-1 ring-primary/20' 
            : 'hover:border-muted-foreground/50'
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {!isSystem && (
              <Checkbox
                id={`category-${stats.category}`}
                checked={isSelected}
                onCheckedChange={() => onToggle(stats.category)}
                disabled={disabled || isSystem}
                className="mt-0.5"
              />
            )}
            <div className={`p-2 rounded-lg bg-muted ${categoryColors[stats.category]}`}>
              {categoryIcons[stats.category]}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {stats.label}
                {isSystem && (
                  <Badge variant="outline" className="text-xs font-normal">
                    <Lock className="h-3 w-3 mr-1" />
                    Read-Only
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {stats.description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Size</p>
            <p className="font-mono font-medium text-lg">
              {stats.sizeFormatted}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Files</p>
            <p className="font-mono font-medium text-lg flex items-center gap-1">
              <File className="h-4 w-4 text-muted-foreground" />
              {stats.fileCount.toLocaleString()}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Last Modified</p>
            <p className="font-medium text-sm flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {stats.lastModified 
                ? format(new Date(stats.lastModified), 'MMM d, HH:mm')
                : 'N/A'
              }
            </p>
          </div>
        </div>

        {/* Subcategories for generated outputs */}
        {stats.subcategories && stats.subcategories.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Breakdown</p>
            <div className="flex flex-wrap gap-2">
              {stats.subcategories.map((sub) => (
                <Badge key={sub.name} variant="secondary" className="text-xs font-normal">
                  {sub.name}: {sub.fileCount} files
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
