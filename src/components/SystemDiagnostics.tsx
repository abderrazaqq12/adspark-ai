import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Database only
import { getUser, getAuthToken } from '@/utils/auth';
import { useEffect, useState } from 'react';

export function SystemDiagnostics() {
  const [diagnostics, setDiagnostics] = useState({
    supabaseUrl: '',
    supabaseKeyPresent: false,
    authInitialized: false,
    userAuthenticated: false,
    deploymentMode: '',
    storageAccessible: false,
  });

  useEffect(() => {
    async function runDiagnostics() {
      const results = {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'NOT SET',
        supabaseKeyPresent: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        // VPS-ONLY: Check VPS auth instead of Supabase auth
        authInitialized: true, // VPS auth is always initialized
        userAuthenticated: false,
        deploymentMode: import.meta.env.VITE_DEPLOYMENT_MODE || 'NOT SET',
        storageAccessible: false,
      };

      // VPS-ONLY: Check VPS authentication
      try {
        const token = getAuthToken();
        const user = getUser();
        results.userAuthenticated = !!token && !!user;
      } catch (e) {
        console.error('Auth check failed:', e);
      }

      // Check storage
      try {
        const { data, error } = await supabase.storage.listBuckets();
        results.storageAccessible = !error && Array.isArray(data);
      } catch (e) {
        console.error('Storage check failed:', e);
      }

      setDiagnostics(results);
    }

    runDiagnostics();
  }, []);

  const DiagnosticItem = ({ label, value, status }: { label: string; value: string | boolean; status: 'success' | 'error' | 'warning' }) => {
    const Icon = status === 'success' ? CheckCircle2 : status === 'error' ? XCircle : AlertTriangle;
    const color = status === 'success' ? 'text-green-500' : status === 'error' ? 'text-destructive' : 'text-amber-500';

    return (
      <div className="flex items-center justify-between p-2 rounded bg-muted/30">
        <span className="text-sm text-muted-foreground">{label}:</span>
        <div className="flex items-center gap-2">
          <code className="text-xs">{typeof value === 'boolean' ? (value ? 'YES' : 'NO') : value}</code>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg">System Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <DiagnosticItem
          label="Supabase URL"
          value={diagnostics.supabaseUrl}
          status={diagnostics.supabaseUrl && diagnostics.supabaseUrl !== 'NOT SET' ? 'success' : 'error'}
        />
        <DiagnosticItem
          label="Supabase Key Present"
          value={diagnostics.supabaseKeyPresent}
          status={diagnostics.supabaseKeyPresent ? 'success' : 'error'}
        />
        <DiagnosticItem
          label="Auth Initialized"
          value={diagnostics.authInitialized}
          status={diagnostics.authInitialized ? 'success' : 'error'}
        />
        <DiagnosticItem
          label="User Authenticated"
          value={diagnostics.userAuthenticated}
          status={diagnostics.userAuthenticated ? 'success' : 'warning'}
        />
        <DiagnosticItem
          label="Deployment Mode"
          value={diagnostics.deploymentMode}
          status={diagnostics.deploymentMode && diagnostics.deploymentMode !== 'NOT SET' ? 'success' : 'warning'}
        />
        <DiagnosticItem
          label="Storage Accessible"
          value={diagnostics.storageAccessible}
          status={diagnostics.storageAccessible ? 'success' : 'error'}
        />

        {!diagnostics.userAuthenticated && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are not authenticated. Please sign in to use upload features.
            </AlertDescription>
          </Alert>
        )}

        {!diagnostics.storageAccessible && (
          <Alert className="mt-4" variant="destructive">
            <AlertDescription>
              Storage buckets are not accessible. Check Supabase configuration and bucket policies.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
