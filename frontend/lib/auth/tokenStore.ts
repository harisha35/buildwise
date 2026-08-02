// Module-level token store shared between the AuthProvider (React) and the
// plain-function API client (lib/api/client.ts), which cannot use hooks.
const STORAGE_KEY = "buildwise.tokens";

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

type Listener = (tokens: Tokens | null) => void;

let current: Tokens | null = null;
const listeners = new Set<Listener>();

function load(): Tokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

current = load();

export function getTokens(): Tokens | null {
  return current;
}

export function setTokens(tokens: Tokens | null) {
  current = tokens;
  if (typeof window !== "undefined") {
    if (tokens) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
  listeners.forEach((listener) => listener(tokens));
}

export function subscribeToTokens(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
