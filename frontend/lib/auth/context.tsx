"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { login as loginRequest } from "@/lib/api/auth";
import { ApiError, setSessionExpiredHandler } from "@/lib/api/client";
import { usersApi } from "@/lib/api/users";
import type { UserOut } from "@/lib/api/types";
import { getTokens, setTokens } from "@/lib/auth/tokenStore";
import { can, type Capability } from "@/lib/auth/permissions";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: UserOut | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (capability: Capability) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<UserOut | null>(null);

  const logout = useCallback(() => {
    setTokens(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await usersApi.me();
      setUser(me);
      setStatus("authenticated");
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    setSessionExpiredHandler(() => logout());
    const tokens = getTokens();
    if (!tokens) {
      setStatus("unauthenticated");
      return;
    }
    refreshUser();
    return () => setSessionExpiredHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const tokens = await loginRequest(email, password);
        setTokens({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
        await refreshUser();
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(0, "Could not reach the server. Please try again.");
      }
    },
    [refreshUser]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login,
      logout,
      can: (capability: Capability) => can(user?.role, capability),
      refreshUser,
    }),
    [status, user, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
