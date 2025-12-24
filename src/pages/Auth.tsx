import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, ShieldCheck, Zap, Globe, Cpu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");

  const from = location.state?.from?.pathname || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (data.ok) {
        toast.success("Identity Verified", {
          description: "VPS administrative session established.",
        });
        signIn(data.token, data.user);
        navigate(from, { replace: true });
      } else {
        toast.error("Access Denied", {
          description: data.message || "Invalid administrative password",
        });
        setPassword("");
      }
    } catch (error) {
      toast.error("System Error", {
        description: "Could not connect to the VPS security gateway.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-6">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-[420px] space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/20">
              <Zap className="w-8 h-8 text-primary-foreground fill-white/10" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tighter text-foreground">FlowScale <span className="text-primary">VPS</span></h1>
            <p className="text-muted-foreground font-medium">Administrative Lockdown Active</p>
          </div>
        </div>

        <Card className="bg-card/50 backdrop-blur-xl border-white/5 shadow-2xl ring-1 ring-white/10 overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x" />
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Authentication</CardTitle>
                <CardDescription>Enter your system primary key</CardDescription>
              </div>
              <Lock className="w-5 h-5 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">Admin Password</Label>
                <div className="relative group">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    className="bg-muted/30 border-white/5 h-12 pl-4 pr-10 focus:ring-primary/50 transition-all duration-300"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary/50 transition-colors">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all duration-300 active:scale-[0.98]"
                disabled={isLoading || !password}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Establishing Secure Session"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Meta Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/40 border border-white/5 backdrop-blur-sm">
            <Globe className="w-4 h-4 text-primary/60" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">Single Node</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/40 border border-white/5 backdrop-blur-sm">
            <Cpu className="w-4 h-4 text-accent/60" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">Hardware Auth</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground/50 font-medium">
            System Perimeter Secured via FlowScale Kernel v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
