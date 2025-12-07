import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Sparkles, 
  FileText, 
  Megaphone, 
  Copy, 
  Star, 
  Trash2,
  RefreshCw,
  Filter,
  Search,
  Loader2,
  Tag,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LocalizationSelector } from "@/components/LocalizationSelector";
import { Language, Market, Audience } from "@/lib/localization";

interface MarketingContent {
  id: string;
  content_type: string;
  content_text: string;
  language: string;
  market: string;
  audience: string;
  is_winning: boolean;
  score: number | null;
  created_at: string;
}

interface ContentFactoryProps {
  projectId?: string;
  productName?: string;
  productDescription?: string;
}

export function ContentFactory({ projectId, productName, productDescription }: ContentFactoryProps) {
  const { user } = useAuth();
  const [hooks, setHooks] = useState<MarketingContent[]>([]);
  const [scripts, setScripts] = useState<MarketingContent[]>([]);
  const [offers, setOffers] = useState<MarketingContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [market, setMarket] = useState<Market>("us");
  const [audience, setAudience] = useState<Audience>("both");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchContent();
    }
  }, [user, projectId]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("marketing_content")
        .select("*")
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setHooks(data?.filter(c => c.content_type === "hook") || []);
      setScripts(data?.filter(c => c.content_type === "script") || []);
      setOffers(data?.filter(c => c.content_type === "offer") || []);
    } catch (error) {
      console.error("Error fetching content:", error);
      toast.error("Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  const generateContent = async (contentType: string) => {
    if (!productName) {
      toast.error("Please provide a product name");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-factory", {
        body: {
          action: `generate_${contentType}s`,
          productName,
          productDescription,
          projectId,
          language,
          market,
          audience,
          count: 10
        }
      });

      if (error) throw error;

      toast.success(`Generated ${data?.count || 0} ${contentType}s successfully`);
      fetchContent();
    } catch (error: any) {
      console.error("Error generating content:", error);
      toast.error(error.message || `Failed to generate ${contentType}s`);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const toggleWinning = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("marketing_content")
        .update({ is_winning: !currentState })
        .eq("id", id);

      if (error) throw error;
      fetchContent();
      toast.success(currentState ? "Removed from winners" : "Marked as winning");
    } catch (error) {
      console.error("Error updating content:", error);
      toast.error("Failed to update");
    }
  };

  const deleteContent = async (id: string) => {
    try {
      const { error } = await supabase
        .from("marketing_content")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchContent();
      toast.success("Content deleted");
    } catch (error) {
      console.error("Error deleting content:", error);
      toast.error("Failed to delete");
    }
  };

  const filterContent = (items: MarketingContent[]) => {
    let filtered = items;
    
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.content_text.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType === "winning") {
      filtered = filtered.filter(item => item.is_winning);
    }

    return filtered;
  };

  const ContentCard = ({ item }: { item: MarketingContent }) => (
    <Card className="bg-card/50 border-border hover:bg-card/80 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-foreground flex-1">{item.content_text}</p>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => toggleWinning(item.id, item.is_winning)}
            >
              <Star className={`w-4 h-4 ${item.is_winning ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => copyToClipboard(item.content_text)}
            >
              <Copy className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => deleteContent(item.id)}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="text-xs">
            {item.language?.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {item.market?.toUpperCase()}
          </Badge>
          {item.score && (
            <Badge className="text-xs bg-primary/20 text-primary border-0">
              Score: {item.score}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="w-5 h-5 text-primary" />
              Content Factory
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              AI-generated hooks, scripts, and offers
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchContent}
            disabled={loading}
            className="border-border"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Localization Settings */}
        <div className="mt-4">
          <LocalizationSelector
            language={language}
            market={market}
            audience={audience}
            onLanguageChange={setLanguage}
            onMarketChange={setMarket}
            onAudienceChange={setAudience}
            compact
          />
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
          <Button
            variant={filterType === "winning" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(filterType === "winning" ? "all" : "winning")}
            className="border-border"
          >
            <Star className="w-4 h-4 mr-1" />
            Winners
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="hooks" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="hooks" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Hooks ({filterContent(hooks).length})
            </TabsTrigger>
            <TabsTrigger value="scripts" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Scripts ({filterContent(scripts).length})
            </TabsTrigger>
            <TabsTrigger value="offers" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Offers ({filterContent(offers).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hooks">
            <div className="space-y-4">
              <Button
                onClick={() => generateContent("hook")}
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generate 10 Hooks
              </Button>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : filterContent(hooks).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hooks generated yet</p>
                    </div>
                  ) : (
                    filterContent(hooks).map((item) => (
                      <ContentCard key={item.id} item={item} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="scripts">
            <div className="space-y-4">
              <Button
                onClick={() => generateContent("script")}
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Generate 10 Scripts
              </Button>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : filterContent(scripts).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No scripts generated yet</p>
                    </div>
                  ) : (
                    filterContent(scripts).map((item) => (
                      <ContentCard key={item.id} item={item} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="offers">
            <div className="space-y-4">
              <Button
                onClick={() => generateContent("offer")}
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Megaphone className="w-4 h-4 mr-2" />
                )}
                Generate 10 Offers
              </Button>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : filterContent(offers).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No offers generated yet</p>
                    </div>
                  ) : (
                    filterContent(offers).map((item) => (
                      <ContentCard key={item.id} item={item} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
