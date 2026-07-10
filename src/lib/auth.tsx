import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "Owner" | "Admin" | "Packing" | "Viewer";

type AuthUser = {
  username: string;
  email: string;
  role: Role;
};

type StoredAuth = {
  user: AuthUser;
  token: string;
  remember: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

const STORAGE_KEY = "novaoms-auth-session";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as StoredAuth;
    if (
      !parsed?.user?.username ||
      !parsed?.user?.email ||
      !parsed?.user?.role ||
      !parsed?.token
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function clearStoredAuth() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function getAuthToken() {
  const stored = getStoredAuth();
  return stored?.token ?? null;
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredAuth();
    if (!stored) {
      setLoading(false);
      return;
    }

    fetch("/api/me", {
      headers: {
        Authorization: `Bearer ${stored.token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Session invalid");
        }
        return response.json();
      })
      .then((payload: { user: AuthUser }) => setUser(payload.user))
      .catch(() => {
        clearStoredAuth();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string, remember: boolean) => {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error("Invalid credentials");
    }

    const payload = (await response.json()) as { user: AuthUser; token: string };
    setUser(payload.user);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: payload.user, token: payload.token, remember }),
      );
    }
  };

  const logout = async () => {
    setUser(null);
    clearStoredAuth();
    await fetch("/api/logout", { method: "POST" });
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
