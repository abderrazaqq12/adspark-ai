import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, Sparkles, Settings, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIAssistantProps {
  context?: string;
  onSuggestion?: (suggestion: string) => void;
}

const AI_PROVIDERS = [
  { id: "lovable", name: "Lovable AI (Free)", requiresKey: false },
  { id: "openai", name: "ChatGPT", requiresKey: true, keyName: "OPENAI_API_KEY" },
  { id: "gemini", name: "Google Gemini", requiresKey: true, keyName: "GEMINI_API_KEY" },
];

export default function AIAssistant({ context, onSuggestion }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState("lovable");
  const [hasApiKey, setHasApiKey] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkApiKeys();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const checkApiKeys = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: settings } = await supabase
      .from("user_settings")
      .select("api_keys")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settings?.api_keys) {
      const keys = settings.api_keys as Record<string, string>;
      setHasApiKey({
        openai: !!keys.OPENAI_API_KEY,
        gemini: !!keys.GEMINI_API_KEY,
      });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const selectedProvider = AI_PROVIDERS.find(p => p.id === provider);
      
      if (selectedProvider?.requiresKey && !hasApiKey[provider]) {
        toast.error(`Please add your ${selectedProvider.name} API key in Settings`);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: {
          message: userMessage,
          provider,
          context: context || "video ad creation",
          history: messages.slice(-10),
        },
      });

      if (error) throw error;

      const assistantMessage = data.response || "I couldn't generate a response. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: assistantMessage }]);

      // Check if suggestion should be applied
      if (data.suggestion && onSuggestion) {
        onSuggestion(data.suggestion);
      }
    } catch (error: any) {
      console.error("AI Assistant error:", error);
      toast.error(error.message || "Failed to get response");
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 bg-gradient-primary shadow-glow z-50"
      >
        <Bot className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] bg-gradient-card border-border shadow-card z-50 flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map(p => (
                  <SelectItem 
                    key={p.id} 
                    value={p.id}
                    disabled={p.requiresKey && !hasApiKey[p.id]}
                  >
                    {p.name}
                    {p.requiresKey && !hasApiKey[p.id] && " 🔒"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-3 pt-0 overflow-hidden">
        <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Ask me anything about video ads!</p>
                <p className="text-xs mt-1">I can help with scripts, hooks, marketing angles...</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg text-sm ${
                  msg.role === "user"
                    ? "bg-primary/20 text-foreground ml-8"
                    : "bg-muted/50 text-foreground mr-8"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="bg-muted/50 p-3 rounded-lg mr-8">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2 mt-3 flex-shrink-0">
          <Textarea
            placeholder="Ask for script ideas, hooks, marketing tips..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="min-h-[60px] resize-none text-sm"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="self-end bg-gradient-primary"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
