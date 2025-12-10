import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Users, Calendar, User } from "lucide-react";

interface AudienceTargetingProps {
  targetMarket: string;
  setTargetMarket: (value: string) => void;
  language: string;
  setLanguage: (value: string) => void;
  audienceAge: string;
  setAudienceAge: (value: string) => void;
  audienceGender: string;
  setAudienceGender: (value: string) => void;
  compact?: boolean;
}

const markets = [
  { value: "gcc", label: "GCC" },
  { value: "europe", label: "Europe" },
  { value: "latam", label: "LATAM" },
];

const languages = [
  { value: "ar", label: "Arabic" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
];

const ageGroups = [
  { value: "18-24", label: "18-24" },
  { value: "25-34", label: "25-34" },
  { value: "35-44", label: "35-44" },
  { value: "45-54", label: "45-54" },
  { value: "55+", label: "55+" },
  { value: "all", label: "All Ages" },
];

const genders = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "all", label: "All Genders" },
];

export function AudienceTargeting({
  targetMarket,
  setTargetMarket,
  language,
  setLanguage,
  audienceAge,
  setAudienceAge,
  audienceGender,
  setAudienceGender,
  compact = false,
}: AudienceTargetingProps) {
  if (compact) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Globe className="w-3 h-3" /> Market
          </Label>
          <Select value={targetMarket} onValueChange={setTargetMarket}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              {markets.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Users className="w-3 h-3" /> Language
          </Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              {languages.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Age
          </Label>
          <Select value={audienceAge} onValueChange={setAudienceAge}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              {ageGroups.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <User className="w-3 h-3" /> Gender
          </Label>
          <Select value={audienceGender} onValueChange={setAudienceGender}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              {genders.map((g) => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-card/50 border-border">
      <CardContent className="p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Audience Targeting
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Globe className="w-3 h-3" /> Target Market
            </Label>
            <Select value={targetMarket} onValueChange={setTargetMarket}>
              <SelectTrigger>
                <SelectValue placeholder="Select market" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                {markets.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> Language
            </Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                {languages.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Audience Age
            </Label>
            <Select value={audienceAge} onValueChange={setAudienceAge}>
              <SelectTrigger>
                <SelectValue placeholder="Select age" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                {ageGroups.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" /> Audience Gender
            </Label>
            <Select value={audienceGender} onValueChange={setAudienceGender}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                {genders.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { markets, languages, ageGroups, genders };
