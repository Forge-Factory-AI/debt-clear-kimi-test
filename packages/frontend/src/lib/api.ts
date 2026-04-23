const API_BASE = "/api";

async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  if (res.status === 401 && path !== "/auth/refresh" && path !== "/auth/login" && path !== "/auth/register") {
    const refreshed = await refreshToken();
    if (refreshed) {
      return fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        credentials: "include",
      });
    }
  }

  return res;
}

export async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function login(email: string, password: string) {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function register(email: string, password: string) {
  const res = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function logout() {
  const res = await apiFetch("/auth/logout", { method: "POST" });
  return { ok: res.ok };
}

export async function me() {
  const res = await apiFetch("/auth/me");
  if (!res.ok) return null;
  const data = await res.json();
  return data.user as { id: string; email: string; createdAt: string };
}
