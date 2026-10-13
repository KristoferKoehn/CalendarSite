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
import { ErrorCodes, type LoginInput, type RegisterInput, type User } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";

type SessionStatus = "loading" | "authenticated" | "anonymous";

type SessionValue = {
  status: SessionStatus;
  user: User | null;
  login: (input: LoginInput) => Promise<ApiError | null>;
  register: (input: RegisterInput) => Promise<ApiError | null>;
  /** Adopt a session token obtained elsewhere, which only the verification link does. */
  adoptSession: (token: string) => Promise<boolean>;
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
          return;
        }
        // Only a rejection by the server means the session is really gone. A network blip
        // must not throw away a valid token, which would sign people out for being briefly
        // offline — and would have done so mid-verification, where a failed refresh is
        // most likely to happen.
        const rejected =
          result.error.code === ErrorCodes.UNAUTHENTICATED ||
          result.error.code === ErrorCodes.FORBIDDEN;
        if (rejected) getApiClient().logout();
        setUser(null);
        setStatus("anonymous");
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
      const result = await getApiClient().register(input);
      if (!result.ok) return result.error;
      // Deliberately does not sign in. Confirmation gates access, so a session here would
      // put an unconfirmed account inside the app; the sign-up screen sends the person to
      // their inbox instead.
      return null;
    },
    [],
  );

  /**
   * Adopt a session token obtained elsewhere and load the user it belongs to.
   *
   * Only the verification link does this: it proves the address and hands back a session, so
   * the details screen behind it is signed in without a password being typed moments after
   * the address was proven by other means.
   */
  const adoptSession = useCallback(async (token: string): Promise<boolean> => {
    const api = getApiClient();
    api.adoptToken(token);
    const me = await api.me();
    if (!me.ok) {
      // A token that does not work is worse than none: leaving it would make every later
      // request fail as though the session had expired.
      api.logout();
      return false;
    }
    setUser(me.value);
    setStatus("authenticated");
    return true;
  }, []);

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
    () => ({ status, user, login, register, adoptSession, logout, refresh, setUser }),
    [status, user, login, register, adoptSession, logout, refresh],
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
