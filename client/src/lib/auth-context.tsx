import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiUrl } from "./api-base";

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

type AuthConfig = {
  google: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  isSignedIn: boolean;
  loading: boolean;
  googleEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function parseAuthError(res: Response): Promise<never> {
  let message = "Something went wrong. Please try again.";
  try {
    const data = (await res.json()) as { message?: string; error?: string };
    if (data.message) message = data.message;
  } catch {
    // ignore
  }
  throw new Error(message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
    if (res.ok) {
      setUser((await res.json()) as AuthUser);
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const configRes = await fetch(apiUrl("/api/auth/config"), { credentials: "include" });
        if (configRes.ok) {
          const config = (await configRes.json()) as AuthConfig;
          setGoogleEnabled(config.google);
        }
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) await parseAuthError(res);
      setUser((await res.json()) as AuthUser);
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      if (!res.ok) await parseAuthError(res);
      setUser((await res.json()) as AuthUser);
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch(apiUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isSignedIn: !!user,
      loading,
      googleEnabled,
      login,
      register,
      logout,
      refresh,
    }),
    [user, loading, googleEnabled, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
