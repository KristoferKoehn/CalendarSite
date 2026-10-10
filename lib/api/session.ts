const STORAGE_KEY = "calendarsite.token";

export interface TokenStore {
  get(): string | null;
  set(token: string): void;
  clear(): void;
}

export function createTokenStore(): TokenStore {
  return {
    get() {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(STORAGE_KEY);
    },
    set(token) {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(STORAGE_KEY, token);
    },
    clear() {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(STORAGE_KEY);
    },
  };
}
