import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { login as apiLogin, register as apiRegister, logout as apiLogout, me, refreshToken } from "@/lib/api";

interface User {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const u = await me();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        refreshToken().catch(() => {});
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    if (result.ok) {
      const u = await me();
      setUser(u);
      return { ok: true };
    }
    return { ok: false, error: result.data?.error || "Invalid credentials" };
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const result = await apiRegister(email, password);
    if (result.ok) {
      const u = await me();
      setUser(u);
      return { ok: true };
    }
    return { ok: false, error: result.data?.error || "Registration failed" };
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
