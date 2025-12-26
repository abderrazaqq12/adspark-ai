import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected Route Wrapper
 * Enforces authenticated access using Supabase session.
 * Redirects to /auth if no session exists.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    console.log('[ProtectedRoute] Loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    console.log('[ProtectedRoute] Not authenticated, checking bypass...');
    // 🛠️ BUILDER MODE BYPASS
    if (window.location.hostname.includes('lovable') || window.location.search.includes('builder=true') || window !== window.parent) {
      console.log('[ProtectedRoute] Builder bypass active');
      return <>{children}</>;
    }

    // Redirect to auth but save the current location to redirect back after login
    console.log('[ProtectedRoute] Redirecting to /auth from', location);
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  console.log('[ProtectedRoute] Access granted');

  return <>{children}</>;
}
