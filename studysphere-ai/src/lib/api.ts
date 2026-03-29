// ─── API Utility ────────────────────────────────────────────────────────────
// Central helper for all HTTP calls.
// Handles: base URL, Bearer token injection, automatic token refresh on 401.

const BASE_URL = (
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_PUBLIC_BACKEND_BASE_URL) ||
  (typeof process !== "undefined" && (process.env?.NEXT_PUBLIC_BACKEND_BASE_URL || process.env?.PUBLIC_BACKEND_BASE_URL)) ||
  "http://localhost:3000"
).replace(/\/$/, "");

// ── Token helpers ────────────────────────────────────────────────────────────
export const TokenStore = {
  get: (): string | null => localStorage.getItem("accessToken"),
  set: (token: string) => localStorage.setItem("accessToken", token),
  clear: () => localStorage.removeItem("accessToken"),
};

// ── Refresh access token using the httpOnly refresh-token cookie ─────────────
async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include", // sends the refreshToken cookie
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token = data?.accessToken ?? data?.token ?? null;
    if (token) TokenStore.set(token);
    return token;
  } catch {
    return null;
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
// Automatically:
//   • Injects Authorization header
//   • Retries once on 401 after refreshing the access token
//   • Returns { data, error, status }
export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  status: number;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit & { isFormData?: boolean } = {}
): Promise<ApiResponse<T>> {
  const { isFormData, ...fetchOptions } = options;

  const buildHeaders = (token: string | null): HeadersInit => {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    // Don't set Content-Type for FormData – browser sets it with boundary
    if (!isFormData) headers["Content-Type"] = "application/json";
    return { ...headers, ...(fetchOptions.headers as Record<string, string> || {}) };
  };

  const doRequest = async (token: string | null) =>
    fetch(`${BASE_URL}${path}`, {
      ...fetchOptions,
      credentials: "include",
      headers: buildHeaders(token),
    });

  let token = TokenStore.get();
  let res = await doRequest(token);

  // Auto-refresh on 401
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doRequest(newToken);
    }
  }

  // Parse body safely
  let data: T | null = null;
  let error: string | null = null;
  try {
    const json = await res.json();
    if (res.ok) {
      data = json;
    } else {
      error = json?.message || json?.error || `Request failed (${res.status})`;
    }
  } catch {
    if (!res.ok) error = `Request failed (${res.status})`;
  }

  return { data, error, status: res.status };
}
