import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, Sparkles, X, Lightbulb, Wand2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAIAgent, AIAgentModel } from "@/hooks/useAIAgent";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIAssistantProps {
  context?: string;
  onSuggestion?: (suggestion: string) => void;
  currentState?: {
    productName?: string;
    scripts?: string[];
    scenes?: any[];
    stage?: number;
  };
}

const AI_AGENT_LABELS: Record<AIAgentModel, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  claude: "Claude",
  llama: "Llama"
};

const QUICK_ACTIONS = [
  { id: "improve_script", label: "Improve my script", icon: Wand2 },
  { id: "suggest_hooks", label: "Suggest marketing hooks", icon: Lightbulb },
  { id: "recommend_engines", label: "Recommend AI engines", icon: Sparkles },
  { id: "review_scenes", label: "Review my scenes", icon: AlertCircle },
];

export default function AIAssistant({ context, onSuggestion, currentState }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastUsedProvider, setLastUsedProvider] = useState<AIAgentModel | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { aiAgent, loading: agentLoading } = useAIAgent();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const buildContextMessage = () => {
    let contextInfo = `Current context: ${context || "video ad creation"}`;
    
    if (currentState) {
      if (currentState.productName) {
        contextInfo += `\nProduct: ${currentState.productName}`;
      }
      if (currentState.stage !== undefined) {
        const stages = ["Product Info", "Script & Audio", "Scene Builder", "Assembly", "Export"];
        contextInfo += `\nCurrent Stage: ${stages[currentState.stage] || `Stage ${currentState.stage}`}`;
      }
      if (currentState.scripts && currentState.scripts.length > 0) {
        contextInfo += `\n\nCurrent Scripts (${currentState.scripts.length}):\n${currentState.scripts.map((s, i) => `Script ${i + 1}: ${s.slice(0, 200)}...`).join('\n')}`;
      }
      if (currentState.scenes && currentState.scenes.length > 0) {
        contextInfo += `\n\nScenes (${currentState.scenes.length}):\n${currentState.scenes.map((s, i) => `Scene ${i + 1}: ${s.description || s.title || 'No description'}`).join('\n')}`;
      }
    }
    
    return contextInfo;
  };

  const handleQuickAction = (actionId: string) => {
    let prompt = "";
    switch (actionId) {
      case "improve_script":
        prompt = "Please review and improve my current scripts. Make them more engaging, add emotional triggers, and optimize for conversions.";
        break;
      case "suggest_hooks":
        prompt = "Based on my product and scripts, suggest 5 attention-grabbing hooks that would work well for TikTok and Instagram ads.";
        break;
      case "recommend_engines":
        prompt = "Based on my video content and budget, which AI video generation engines would you recommend? Consider quality, cost, and speed.";
        break;
      case "review_scenes":
        prompt = "Review my scene breakdown and suggest improvements. Are the transitions good? Is the pacing right? Any scenes I should add or remove?";
        break;
    }
    setInput(prompt);
  };

  const sendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || input.trim();
    if (!messageToSend || isLoading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: messageToSend }]);
    setIsLoading(true);

    try {
      const contextMessage = buildContextMessage();

      // Use the ai-fallback edge function with preferred agent from settings
      const { data, error } = await supabase.functions.invoke("ai-fallback", {
        body: {
          prompt: `${contextMessage}\n\nUser question: ${messageToSend}`,
          systemPrompt: `You are FlowScale AI Assistant, an expert in video ad creation, marketing, and AI-powered content generation. 
You help users create compelling video ads by:
- Writing and improving scripts
- Suggesting marketing hooks and CTAs
- Recommending AI video engines based on requirements
- Reviewing scenes and providing feedback
- Optimizing content for different platforms (TikTok, Instagram, YouTube)

Be concise, actionable, and focus on practical advice. When suggesting improvements, be specific.`,
          maxTokens: 1500,
          preferredAgent: aiAgent
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to get response from AI");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage = data.response || "I couldn't generate a response. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: assistantMessage }]);
      setLastUsedProvider(data.provider as AIAgentModel);

      // Notify if fallback was used
      if (data.fallbacksAttempted > 0) {
        toast.info(`Used ${AI_AGENT_LABELS[data.provider as AIAgentModel] || data.provider} as fallback`);
      }

      // Check if suggestion should be applied
      if (data.suggestion && onSuggestion) {
        onSuggestion(data.suggestion);
        toast.success("AI suggestion applied!");
      }
    } catch (error: any) {
      console.error("AI Assistant error:", error);
      toast.error(`AI Assistant Error: ${error.message || "Unknown error"}`);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please check your API keys in Settings → Preferences." 
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
    <Card className="fixed bottom-6 right-6 w-[420px] h-[550px] bg-gradient-card border-border shadow-card z-50 flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {agentLoading ? "Loading..." : AI_AGENT_LABELS[aiAgent]}
            </Badge>
            {lastUsedProvider && lastUsedProvider !== aiAgent && (
              <Badge variant="secondary" className="text-xs">
                Used: {AI_AGENT_LABELS[lastUsedProvider]}
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-3 pt-0 overflow-hidden">
        {/* Quick Actions */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_ACTIONS.map(action => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action.id)}
                className="text-xs h-7"
              >
                <action.icon className="w-3 h-3 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>
        )}

        <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">I can help you with:</p>
                <ul className="text-xs mt-2 space-y-1">
                  <li>• Writing & improving scripts</li>
                  <li>• Suggesting marketing hooks</li>
                  <li>• Recommending AI engines</li>
                  <li>• Reviewing your scenes</li>
                  <li>• Optimizing for platforms</li>
                </ul>
                <p className="text-xs mt-4 text-muted-foreground/70">
                  Using: {AI_AGENT_LABELS[aiAgent]} (with auto-fallback)
                </p>
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
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
            {isLoading && (
              <div className="bg-muted/50 p-3 rounded-lg mr-8 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2 mt-3 flex-shrink-0">
          <Textarea
            placeholder="Ask for script ideas, hooks, improvements..."
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
            onClick={() => sendMessage()}
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
