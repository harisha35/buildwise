import { getTokens, setTokens } from "@/lib/auth/tokenStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

/** Fires when a request fails auth even after a refresh attempt, so the app shell can redirect to /login. */
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;
export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  onSessionExpired = handler;
}

async function rawRequest(path: string, init: RequestInit, accessToken: string | null) {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_URL}${path}`, { ...init, headers });
}

async function refreshTokens(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens) return null;
  try {
    const response = await rawRequest(
      "/auth/refresh",
      { method: "POST", body: JSON.stringify({ refresh_token: tokens.refreshToken }) },
      null
    );
    if (!response.ok) {
      setTokens(null);
      return null;
    }
    const data = (await response.json()) as { access_token: string; refresh_token: string };
    setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
    return data.access_token;
  } catch {
    return null;
  }
}

async function parseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, options?: { skipAuth?: boolean }): Promise<T> {
  const skipAuth = options?.skipAuth ?? false;
  let tokens = getTokens();
  let response = await rawRequest(path, init, skipAuth ? null : tokens?.accessToken ?? null);

  if (!skipAuth && response.status === 401 && tokens) {
    const newAccessToken = await refreshTokens();
    if (newAccessToken) {
      response = await rawRequest(path, init, newAccessToken);
    } else {
      onSessionExpired?.();
      throw new ApiError(401, "Session expired");
    }
  }

  if (response.status === 401 && !skipAuth) {
    onSessionExpired?.();
  }

  if (!response.ok) {
    const body = await parseBody(response);
    const detail =
      body && typeof body === "object" && "detail" in body ? (body as { detail: unknown }).detail : body;
    const message = typeof detail === "string" ? detail : `Request failed (${response.status})`;
    throw new ApiError(response.status, message, detail);
  }

  if (response.status === 204) return undefined as T;
  return (await parseBody(response)) as T;
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown, options?: { skipAuth?: boolean }) {
  return apiRequest<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }, options);
}

export function apiPatch<T>(path: string, body?: unknown) {
  return apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export async function apiUpload(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<{ url: string }>("/uploads", { method: "POST", body: form });
}

export { refreshTokens };
