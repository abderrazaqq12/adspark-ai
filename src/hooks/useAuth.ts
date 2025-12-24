import { useEffect, useState } from "react";
import { isBuilderMode } from "../utils/dev-adapter";

export interface User {
  id: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('flowscale_token'));

  useEffect(() => {
    // 🛠️ BUILDER MODE BYPASS
    if (isBuilderMode()) {
      setUser({ id: 'builder', role: 'dev' });
      setToken('mock-builder-token');
      setLoading(false);
      return;
    }

    const storedToken = localStorage.getItem('flowscale_token');
    const storedUser = localStorage.getItem('flowscale_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signIn = (newToken: string, newUser: User) => {
    localStorage.setItem('flowscale_token', newToken);
    localStorage.setItem('flowscale_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const signOut = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (e) {
      console.warn("Logout notification failed:", e);
    }
    localStorage.removeItem('flowscale_token');
    localStorage.removeItem('flowscale_user');
    setToken(null);
    setUser(null);
    window.location.href = '/auth';
  };

  return {
    user,
    loading,
    token,
    authenticated: !!token,
    signIn,
    signOut
  };
}
