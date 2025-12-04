import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function CreditsDisplay() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchCredits();
      
      // Subscribe to profile changes for real-time credit updates
      const channel = supabase
        .channel('credits-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            if (payload.new && typeof payload.new.credits === 'number') {
              setCredits(payload.new.credits);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchCredits = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();
    
    if (data) {
      setCredits(data.credits);
    }
  };

  if (credits === null) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
      <Zap className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium text-foreground">{credits}</span>
      <span className="text-xs text-muted-foreground">credits</span>
    </div>
  );
}
