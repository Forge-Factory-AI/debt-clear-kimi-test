import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE = "/api";

async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await apiFetch("/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setIsAuthenticated(true);
        return true;
      }
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } catch {
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    checkAuth().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checkAuth]);

  const refreshSession = useCallback(async () => {
    try {
      const res = await apiFetch("/auth/refresh", { method: "POST" });
      if (res.ok) {
        return checkAuth();
      }
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } catch {
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
  }, [checkAuth]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid credentials");
      }

      const data = await res.json();
      setUser(data.user);
      setIsAuthenticated(true);
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Registration failed");
      }

      const data = await res.json();
      setUser(data.user);
      setIsAuthenticated(true);
    },
    []
  );

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
