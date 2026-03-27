import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { api, setApiToken } from "../lib/api";
import { clearAuthSession, readAuthSession, saveAuthSession } from "../lib/storage";
import { User, UserRole } from "../types";

type RegisterPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  businessName?: string;
  address?: string;
};

type AuthContextValue = {
  loading: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: { name: string; phone: string; password?: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const session = await readAuthSession();
        if (session.token) {
          setToken(session.token);
          setApiToken(session.token);
        }
        if (session.user) {
          setUser(session.user);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    const nextToken: string = response.data.token;
    const nextUser: User = response.data.user;
    setToken(nextToken);
    setApiToken(nextToken);
    setUser(nextUser);
    await saveAuthSession(nextToken, nextUser);
  };

  const register = async (payload: RegisterPayload) => {
    const response = await api.post("/auth/register", payload);
    const nextToken: string = response.data.token;
    const nextUser: User = response.data.user;
    setToken(nextToken);
    setApiToken(nextToken);
    setUser(nextUser);
    await saveAuthSession(nextToken, nextUser);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setApiToken(null);
    await clearAuthSession();
  };

  const updateProfile = async (payload: { name: string; phone: string; password?: string }) => {
    const response = await api.put("/auth/profile", payload);
    const nextUser = response.data as User & { token?: string };

    const normalized: User = {
      ...user,
      ...nextUser,
      role: (nextUser.role || user?.role || "customer") as UserRole,
      name: nextUser.name,
      phone: nextUser.phone,
      email: nextUser.email || user?.email,
    };

    let nextToken = token;
    if (nextUser.token) {
      nextToken = nextUser.token;
      setToken(nextToken);
      setApiToken(nextToken);
    }

    setUser(normalized);
    await saveAuthSession(nextToken || "", normalized);
  };

  const value = useMemo(
    () => ({
      loading,
      user,
      token,
      login,
      register,
      logout,
      updateProfile,
    }),
    [loading, user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
