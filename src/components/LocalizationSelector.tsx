import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Globe, Users, MapPin } from 'lucide-react';
import { 
  LANGUAGE_NAMES, MARKET_NAMES, AUDIENCE_NAMES,
  type Language, type Market, type Audience,
  MARKET_PROFILES
} from '@/lib/localization';
import { Badge } from '@/components/ui/badge';

interface LocalizationSelectorProps {
  language: Language;
  market: Market;
  audience: Audience;
  onLanguageChange: (language: Language) => void;
  onMarketChange: (market: Market) => void;
  onAudienceChange: (audience: Audience) => void;
  showProfile?: boolean;
  compact?: boolean;
}

export const LocalizationSelector = ({
  language,
  market,
  audience,
  onLanguageChange,
  onMarketChange,
  onAudienceChange,
  showProfile = false,
  compact = false
}: LocalizationSelectorProps) => {
  const profile = MARKET_PROFILES[market];
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Select value={language} onValueChange={(v) => onLanguageChange(v as Language)}>
          <SelectTrigger className="w-28 h-8">
            <Globe className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LANGUAGE_NAMES).map(([key, { english, native }]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  {english}
                  <span className="text-muted-foreground text-xs">({native})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={market} onValueChange={(v) => onMarketChange(v as Market)}>
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MARKET_NAMES).map(([key, { name, flag }]) => (
              <SelectItem key={key} value={key}>{flag} {name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={audience} onValueChange={(v) => onAudienceChange(v as Audience)}>
          <SelectTrigger className="w-28 h-8">
            <Users className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(AUDIENCE_NAMES).map(([key, name]) => (
              <SelectItem key={key} value={key}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Language
          </Label>
          <Select value={language} onValueChange={(v) => onLanguageChange(v as Language)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LANGUAGE_NAMES).map(([key, { english, native }]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    {english}
                    <span className="text-muted-foreground text-xs">({native})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Target Market
          </Label>
          <Select value={market} onValueChange={(v) => onMarketChange(v as Market)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MARKET_NAMES).map(([key, { name, flag }]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span>{flag}</span>
                    {name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Target Audience
          </Label>
          <Select value={audience} onValueChange={(v) => onAudienceChange(v as Audience)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AUDIENCE_NAMES).map(([key, name]) => (
                <SelectItem key={key} value={key}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {showProfile && profile && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h4 className="font-medium text-sm">Cultural Profile: {MARKET_NAMES[market].flag} {MARKET_NAMES[market].name}</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tone</span>
              <span>{profile.tone}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">CTA Style</span>
              <span>{profile.ctaStyle}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Hook Style</span>
              <span>{profile.hookStyle}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Urgency Level</span>
              <Badge variant={
                profile.urgencyLevel === 'high' ? 'destructive' :
                profile.urgencyLevel === 'medium' ? 'secondary' : 'outline'
              }>
                {profile.urgencyLevel}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Emotional Level</span>
              <Badge variant={
                profile.emotionalLevel === 'intense' ? 'destructive' :
                profile.emotionalLevel === 'moderate' ? 'secondary' : 'outline'
              }>
                {profile.emotionalLevel}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Trust Signals</span>
              <div className="flex flex-wrap gap-1">
                {profile.trustSignals.map((signal, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{signal}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
