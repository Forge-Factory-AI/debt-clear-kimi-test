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

export interface CreateDebtInput {
  name: string;
  creditor: string;
  originalAmount: number;
  remainingAmount?: number;
  interestRate?: number;
  dueDate?: string;
}

export interface UpdateDebtInput {
  name?: string;
  creditor?: string;
  originalAmount?: number;
  remainingAmount?: number;
  interestRate?: number;
  dueDate?: string | null;
}

export async function createDebt(input: CreateDebtInput): Promise<Debt> {
  const res = await apiFetch("/debts", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to create debt");
  }
  const data = await res.json();
  return data.debt as Debt;
}

export async function updateDebt(id: string, input: UpdateDebtInput): Promise<Debt> {
  const res = await apiFetch(`/debts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to update debt");
  }
  const data = await res.json();
  return data.debt as Debt;
}

export async function deleteDebt(id: string): Promise<void> {
  const res = await apiFetch(`/debts/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to delete debt");
  }
}

export async function archiveDebt(id: string): Promise<Debt> {
  const res = await apiFetch(`/debts/${id}/archive`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to archive debt");
  }
  const data = await res.json();
  return data.debt as Debt;
}

export async function restoreDebt(id: string): Promise<Debt> {
  const res = await apiFetch(`/debts/${id}/restore`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to restore debt");
  }
  const data = await res.json();
  return data.debt as Debt;
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
