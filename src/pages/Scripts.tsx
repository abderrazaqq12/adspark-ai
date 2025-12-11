import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Copy, Play, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Script {
  id: string;
  raw_text: string;
  language: string;
  tone: string;
  style: string;
  status: string;
  created_at: string;
}

export default function Scripts() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    try {
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScripts(data || []);
    } catch (error) {
      console.error('Error loading scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Script copied to clipboard",
    });
  };

  const deleteScript = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scripts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setScripts(prev => prev.filter(s => s.id !== id));
      toast({
        title: "Deleted",
        description: "Script removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete script",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Script Library</h1>
          <p className="text-muted-foreground">
            All your video scripts and templates
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {scripts.length} Scripts
        </Badge>
      </div>
      
      {scripts.length === 0 ? (
        <Card className="bg-gradient-card border-border">
          <CardContent className="py-16 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No scripts yet</h3>
            <p className="text-muted-foreground">Created scripts will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {scripts.map((script) => (
            <Card key={script.id} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">{script.language || 'N/A'}</Badge>
                      {script.tone && (
                        <Badge variant="secondary">{script.tone}</Badge>
                      )}
                      {script.status && (
                        <Badge 
                          variant={script.status === 'completed' ? 'default' : 'secondary'}
                          className={script.status === 'completed' ? 'bg-green-500/20 text-green-500' : ''}
                        >
                          {script.status}
                        </Badge>
                      )}
                    </div>
                    <p 
                      className="text-sm text-foreground line-clamp-4 whitespace-pre-wrap"
                      dir={script.language === 'ar' ? 'rtl' : 'ltr'}
                    >
                      {script.raw_text}
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">
                      Created: {new Date(script.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(script.raw_text)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteScript(script.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
