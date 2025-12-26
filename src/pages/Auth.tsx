import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Sparkles, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type AuthMode = 'signin' | 'signup';

export default function Auth() {
  const navigate = useNavigate();
  const { signUp, signInWithEmail, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (mode === 'signup' && !fullName) return;

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error("Sign up failed", { description: error.message });
        } else {
          toast.success("Account created!", {
            description: "Check your email to verify your account."
          });
          setMode('signin');
        }
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          toast.error("Sign in failed", { description: error.message });
        } else {
          toast.success("Welcome back!", { description: "Redirecting to dashboard..." });
          navigate('/app');
        }
      }
    } catch (error) {
      toast.error("Something went wrong", { description: "Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error("Google sign in failed", { description: error.message });
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-violet-600/30 via-purple-500/20 to-transparent rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-indigo-600/20 via-violet-500/15 to-transparent rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[80px]" />
      </div>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-[420px] mx-4">
        {/* Glassmorphic Card */}
        <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with Logo */}
          <div className="pt-8 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-white">FlowScale</span>
            </div>

            {/* Toggle Tabs */}
            <div className="flex items-center justify-center gap-1 bg-white/5 rounded-full p-1 mx-8">
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-300 ${mode === 'signup'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-white/70 hover:text-white'
                  }`}
              >
                Sign up
              </button>
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-300 ${mode === 'signin'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-white/70 hover:text-white'
                  }`}
              >
                Sign in
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-8 pb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              {mode === 'signup' ? 'Create an account' : 'Welcome back'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name - Sign Up Only */}
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-white/70 text-sm">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={mode === 'signup'}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 pl-10 focus:ring-violet-500/50 focus:border-violet-500/50"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70 text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 pl-10 focus:ring-violet-500/50 focus:border-violet-500/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/70 text-sm">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 pl-10 pr-10 focus:ring-violet-500/50 focus:border-violet-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-white hover:bg-white/90 text-black font-semibold shadow-lg transition-all duration-300 mt-6"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{mode === 'signup' ? 'Creating account...' : 'Signing in...'}</span>
                  </div>
                ) : (
                  mode === 'signup' ? 'Create an account' : 'Sign in'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-black/40 px-3 text-white/40">or continue with</span>
              </div>
            </div>

            {/* Google OAuth */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            {/* Terms */}
            <p className="text-center text-xs text-white/40 mt-6">
              By continuing, you agree to our{' '}
              <Link to="/terms" className="text-violet-400 hover:text-violet-300 underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-violet-400 hover:text-violet-300 underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-white/50 hover:text-white transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
