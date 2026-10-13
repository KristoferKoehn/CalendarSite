"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LoginInput, RegisterInput, User } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";

type SessionStatus = "loading" | "authenticated" | "anonymous";

type SessionValue = {
  status: SessionStatus;
  user: User | null;
  login: (input: LoginInput) => Promise<ApiError | null>;
  register: (input: RegisterInput) => Promise<ApiError | null>;
  logout: () => void;
  /** Re-read the current user, e.g. after editing the profile. */
  refresh: () => Promise<void>;
  /** Replace the cached user after a successful self-update. */
  setUser: (user: User) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getApiClient()
      .me()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setUser(result.value);
          setStatus("authenticated");
        } else {
          getApiClient().logout();
          setUser(null);
          setStatus("anonymous");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<ApiError | null> => {
    const api = getApiClient();
    const result = await api.login(input);
    if (!result.ok) return result.error;

    const me = await api.me();
    if (!me.ok) return me.error;

    setUser(me.value);
    setStatus("authenticated");
    return null;
  }, []);

  const register = useCallback(
    async (input: RegisterInput): Promise<ApiError | null> => {
      const api = getApiClient();
      const result = await api.register(input);
      if (!result.ok) return result.error;
      return login(input);
    },
    [login],
  );

  const logout = useCallback(() => {
    getApiClient().logout();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const refresh = useCallback(async () => {
    const result = await getApiClient().me();
    if (result.ok) {
      setUser(result.value);
      setStatus("authenticated");
      return;
    }
    getApiClient().logout();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo(
    () => ({ status, user, login, register, logout, refresh, setUser }),
    [status, user, login, register, logout, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
