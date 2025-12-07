import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Video, Mic, Image, FileText, Zap, TrendingDown } from 'lucide-react';

interface CostBreakdown {
  scripts: number;
  voiceovers: number;
  sceneVideos: number;
  images: number;
  assembly: number;
}

interface CostEstimatorPanelProps {
  scriptsCount: number;
  scenesPerScript: number;
  variationsPerScene: number;
  imagesCount: number;
  pricingTier: 'free' | 'budget' | 'standard' | 'premium';
  onTierChange?: (tier: 'free' | 'budget' | 'standard' | 'premium') => void;
}

// Cost estimates per operation by tier (in USD)
const COST_RATES = {
  free: {
    script: 0,
    voiceover: 0,
    sceneVideo: 0,
    image: 0,
    assembly: 0
  },
  budget: {
    script: 0.002,
    voiceover: 0.01,
    sceneVideo: 0.05,
    image: 0.02,
    assembly: 0.01
  },
  standard: {
    script: 0.005,
    voiceover: 0.02,
    sceneVideo: 0.15,
    image: 0.05,
    assembly: 0.02
  },
  premium: {
    script: 0.01,
    voiceover: 0.03,
    sceneVideo: 0.50,
    image: 0.10,
    assembly: 0.05
  }
};

export const CostEstimatorPanel = ({
  scriptsCount,
  scenesPerScript,
  variationsPerScene,
  imagesCount,
  pricingTier,
  onTierChange
}: CostEstimatorPanelProps) => {
  const [breakdown, setBreakdown] = useState<CostBreakdown>({
    scripts: 0,
    voiceovers: 0,
    sceneVideos: 0,
    images: 0,
    assembly: 0
  });
  
  useEffect(() => {
    const rates = COST_RATES[pricingTier];
    const totalScenes = scriptsCount * scenesPerScript;
    const totalVideos = totalScenes * variationsPerScene;
    
    setBreakdown({
      scripts: scriptsCount * rates.script,
      voiceovers: scriptsCount * rates.voiceover,
      sceneVideos: totalVideos * rates.sceneVideo,
      images: imagesCount * rates.image,
      assembly: scriptsCount * rates.assembly
    });
  }, [scriptsCount, scenesPerScript, variationsPerScene, imagesCount, pricingTier]);
  
  const totalCost = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const totalVideos = scriptsCount * scenesPerScript * variationsPerScene;
  const costPerVideo = totalVideos > 0 ? totalCost / totalVideos : 0;
  
  const tiers = [
    { id: 'free', label: 'Free', color: 'bg-green-500' },
    { id: 'budget', label: 'Budget', color: 'bg-blue-500' },
    { id: 'standard', label: 'Standard', color: 'bg-purple-500' },
    { id: 'premium', label: 'Premium', color: 'bg-amber-500' }
  ];
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Cost Estimator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tier Selector */}
        {onTierChange && (
          <div className="flex gap-2">
            {tiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => onTierChange(tier.id as typeof pricingTier)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  pricingTier === tier.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        )}
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Estimated Cost</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-2xl font-bold">${costPerVideo.toFixed(4)}</p>
            <p className="text-xs text-muted-foreground">Cost Per Video</p>
          </div>
        </div>
        
        {/* Generation Stats */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Videos</span>
          <Badge variant="secondary">{totalVideos}</Badge>
        </div>
        
        <Separator />
        
        {/* Cost Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Cost Breakdown</h4>
          
          <div className="space-y-2">
            <CostItem 
              icon={<FileText className="h-4 w-4" />}
              label="Script Generation"
              count={scriptsCount}
              cost={breakdown.scripts}
              total={totalCost}
            />
            <CostItem 
              icon={<Mic className="h-4 w-4" />}
              label="Voiceovers"
              count={scriptsCount}
              cost={breakdown.voiceovers}
              total={totalCost}
            />
            <CostItem 
              icon={<Video className="h-4 w-4" />}
              label="Scene Videos"
              count={scriptsCount * scenesPerScript * variationsPerScene}
              cost={breakdown.sceneVideos}
              total={totalCost}
            />
            <CostItem 
              icon={<Image className="h-4 w-4" />}
              label="Images"
              count={imagesCount}
              cost={breakdown.images}
              total={totalCost}
            />
            <CostItem 
              icon={<Zap className="h-4 w-4" />}
              label="Assembly"
              count={scriptsCount}
              cost={breakdown.assembly}
              total={totalCost}
            />
          </div>
        </div>
        
        {/* Savings Tip */}
        {pricingTier !== 'free' && (
          <div className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg text-sm">
            <TrendingDown className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium text-green-600">Save with Free Tier</p>
              <p className="text-muted-foreground text-xs">
                Switch to free tier engines to reduce costs
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface CostItemProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  cost: number;
  total: number;
}

const CostItem = ({ icon, label, count, cost, total }: CostItemProps) => {
  const percentage = total > 0 ? (cost / total) * 100 : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span>{label}</span>
          <Badge variant="outline" className="text-xs">{count}</Badge>
        </div>
        <span className="font-medium">${cost.toFixed(3)}</span>
      </div>
      <Progress value={percentage} className="h-1" />
    </div>
  );
};
