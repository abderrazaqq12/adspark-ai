import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  // VPS SINGLE USER MODE
  // Always authorize as Admin
  const [user] = useState<User | null>({
    id: '00000000-0000-0000-0000-000000000000',
    app_metadata: { provider: 'email' },
    user_metadata: { name: 'Admin User' },
    aud: 'authenticated',
    created_at: new Date().toISOString()
  } as User);

  const [loading] = useState(false);

  // No-op for sign out
  const signOut = async () => {
    console.log('Sign out disabled in Single User Mode');
  };

  return { user, loading, signOut };
}
