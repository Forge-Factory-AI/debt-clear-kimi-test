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

export interface Debt {
  id: string;
  name: string;
  creditor: string;
  originalAmount: number | null;
  remainingAmount: number | null;
  interestRate: number | null;
  dueDate: Date | null;
  isArchived: boolean;
  isPaidOff: boolean;
  paidOffAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface DebtSummary {
  totalOriginal: number;
  totalRemaining: number;
  totalPaid: number;
  debtCount: number;
  paidOffCount: number;
  activeCount: number;
}

export async function getDebts(): Promise<Debt[]> {
  const res = await apiFetch("/debts");
  if (!res.ok) throw new Error("Failed to fetch debts");
  const data = await res.json();
  return (data.debts as Debt[]) ?? [];
}

export async function getDebtSummary(): Promise<DebtSummary> {
  const res = await apiFetch("/debts/summary");
  if (!res.ok) throw new Error("Failed to fetch summary");
  const data = await res.json();
  return (data.summary as DebtSummary) ?? {
    totalOriginal: 0,
    totalRemaining: 0,
    totalPaid: 0,
    debtCount: 0,
    paidOffCount: 0,
    activeCount: 0,
  };
}
