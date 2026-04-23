import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import ArchivedPage from "./ArchivedPage";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockAuthenticated() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/auth/me")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
      });
    }
    if (url.includes("/api/debts?archived=true")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            debts: [
              {
                id: "debt-1",
                name: "Old Car Loan",
                creditor: "Bank of America",
                originalAmount: 25000,
                remainingAmount: 5000,
                interestRate: 4.5,
                dueDate: null,
                isArchived: true,
                isPaidOff: false,
                paidOffAt: null,
                createdAt: "2024-01-01T00:00:00Z",
                updatedAt: "2024-01-01T00:00:00Z",
                userId: "1",
              },
              {
                id: "debt-2",
                name: "Paid Off Credit Card",
                creditor: "Chase",
                originalAmount: 5000,
                remainingAmount: 0,
                interestRate: 18.9,
                dueDate: "2025-01-01T00:00:00Z",
                isArchived: true,
                isPaidOff: true,
                paidOffAt: "2024-06-01T00:00:00Z",
                createdAt: "2024-01-01T00:00:00Z",
                updatedAt: "2024-01-01T00:00:00Z",
                userId: "1",
              },
            ],
          }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function mockEmptyState() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/auth/me")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
      });
    }
    if (url.includes("/api/debts?archived=true")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ debts: [] }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function mockError() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/auth/me")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
      });
    }
    if (url.includes("/api/debts?archived=true")) {
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: "Server error" }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function renderWithProviders() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <ArchivedPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("ArchivedPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders archived debts heading", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /archived debts/i })).toBeInTheDocument();
    });
  });

  it("renders archived debt cards", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Old Car Loan")).toBeInTheDocument();
    });

    expect(screen.getByText("Paid Off Credit Card")).toBeInTheDocument();
    expect(screen.getByText("Bank of America")).toBeInTheDocument();
    expect(screen.getByText("Chase")).toBeInTheDocument();
  });

  it("shows correct progress percentages", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Old Car Loan")).toBeInTheDocument();
    });

    // Old Car Loan: (25000 - 5000) / 25000 = 80%
    expect(screen.getByText("80%")).toBeInTheDocument();
    // Paid Off Credit Card: (5000 - 0) / 5000 = 100%
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("shows empty state when no archived debts", async () => {
    mockEmptyState();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/no archived debts/i)).toBeInTheDocument();
    });
  });

  it("shows error message on fetch failure", async () => {
    mockError();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/failed to load archived debts/i)).toBeInTheDocument();
    });
  });

  it("renders skeleton loading state", async () => {
    mockAuthenticated();
    renderWithProviders();

    expect(document.querySelectorAll("[class*='animate-pulse']").length).toBeGreaterThan(0);
  });

  it("renders restore buttons for each archived debt", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Old Car Loan")).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByRole("button", { name: /restore/i });
    expect(restoreButtons.length).toBe(2);
  });

  it("restores a debt and removes it from the list", async () => {
    let restored = false;
    mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
      const url = _url;
      const method = options?.method ?? "GET";
      if (url.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
        });
      }
      if (url === "/api/debts/debt-1/restore" && method === "POST") {
        restored = true;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              debt: {
                id: "debt-1",
                name: "Old Car Loan",
                creditor: "Bank of America",
                originalAmount: 25000,
                remainingAmount: 5000,
                interestRate: 4.5,
                dueDate: null,
                isArchived: false,
                isPaidOff: false,
                paidOffAt: null,
                createdAt: "2024-01-01T00:00:00Z",
                updatedAt: "2024-01-01T00:00:00Z",
                userId: "1",
              },
            }),
        });
      }
      if (url.includes("/api/debts?archived=true") && !restored) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              debts: [
                {
                  id: "debt-1",
                  name: "Old Car Loan",
                  creditor: "Bank of America",
                  originalAmount: 25000,
                  remainingAmount: 5000,
                  interestRate: 4.5,
                  dueDate: null,
                  isArchived: true,
                  isPaidOff: false,
                  paidOffAt: null,
                  createdAt: "2024-01-01T00:00:00Z",
                  updatedAt: "2024-01-01T00:00:00Z",
                  userId: "1",
                },
                {
                  id: "debt-2",
                  name: "Paid Off Credit Card",
                  creditor: "Chase",
                  originalAmount: 5000,
                  remainingAmount: 0,
                  interestRate: 18.9,
                  dueDate: "2025-01-01T00:00:00Z",
                  isArchived: true,
                  isPaidOff: true,
                  paidOffAt: "2024-06-01T00:00:00Z",
                  createdAt: "2024-01-01T00:00:00Z",
                  updatedAt: "2024-01-01T00:00:00Z",
                  userId: "1",
                },
              ],
            }),
        });
      }
      if (url.includes("/api/debts?archived=true") && restored) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              debts: [
                {
                  id: "debt-2",
                  name: "Paid Off Credit Card",
                  creditor: "Chase",
                  originalAmount: 5000,
                  remainingAmount: 0,
                  interestRate: 18.9,
                  dueDate: "2025-01-01T00:00:00Z",
                  isArchived: true,
                  isPaidOff: true,
                  paidOffAt: "2024-06-01T00:00:00Z",
                  createdAt: "2024-01-01T00:00:00Z",
                  updatedAt: "2024-01-01T00:00:00Z",
                  userId: "1",
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Old Car Loan")).toBeInTheDocument();
    });

    // Click restore on first debt
    const restoreButtons = screen.getAllByRole("button", { name: /restore/i });
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText("Old Car Loan")).not.toBeInTheDocument();
    });

    // Second debt should still be present
    expect(screen.getByText("Paid Off Credit Card")).toBeInTheDocument();
  });

  it("shows toast notification on successful restore", async () => {
    mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
      const url = _url;
      const method = options?.method ?? "GET";
      if (url.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
        });
      }
      if (url === "/api/debts/debt-1/restore" && method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              debt: {
                id: "debt-1",
                name: "Old Car Loan",
                creditor: "Bank of America",
                originalAmount: 25000,
                remainingAmount: 5000,
                interestRate: 4.5,
                dueDate: null,
                isArchived: false,
                isPaidOff: false,
                paidOffAt: null,
                createdAt: "2024-01-01T00:00:00Z",
                updatedAt: "2024-01-01T00:00:00Z",
                userId: "1",
              },
            }),
        });
      }
      if (url.includes("/api/debts?archived=true")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              debts: [
                {
                  id: "debt-1",
                  name: "Old Car Loan",
                  creditor: "Bank of America",
                  originalAmount: 25000,
                  remainingAmount: 5000,
                  interestRate: 4.5,
                  dueDate: null,
                  isArchived: true,
                  isPaidOff: false,
                  paidOffAt: null,
                  createdAt: "2024-01-01T00:00:00Z",
                  updatedAt: "2024-01-01T00:00:00Z",
                  userId: "1",
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Old Car Loan")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /restore/i }));

    await waitFor(() => {
      expect(screen.getByText("Debt restored successfully")).toBeInTheDocument();
    });
  });

  it("shows toast notification on restore failure", async () => {
    mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
      const url = _url;
      const method = options?.method ?? "GET";
      if (url.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
        });
      }
      if (url === "/api/debts/debt-1/restore" && method === "POST") {
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: "Server error" }) });
      }
      if (url.includes("/api/debts?archived=true")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              debts: [
                {
                  id: "debt-1",
                  name: "Old Car Loan",
                  creditor: "Bank of America",
                  originalAmount: 25000,
                  remainingAmount: 5000,
                  interestRate: 4.5,
                  dueDate: null,
                  isArchived: true,
                  isPaidOff: false,
                  paidOffAt: null,
                  createdAt: "2024-01-01T00:00:00Z",
                  updatedAt: "2024-01-01T00:00:00Z",
                  userId: "1",
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Old Car Loan")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /restore/i }));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("does not show confirmation dialog on restore", async () => {
    mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
      const url = _url;
      const method = options?.method ?? "GET";
      if (url.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
        });
      }
      if (url === "/api/debts/debt-1/restore" && method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              debt: {
                id: "debt-1",
                name: "Old Car Loan",
                creditor: "Bank of America",
                originalAmount: 25000,
                remainingAmount: 5000,
                interestRate: 4.5,
                dueDate: null,
                isArchived: false,
                isPaidOff: false,
                paidOffAt: null,
                createdAt: "2024-01-01T00:00:00Z",
                updatedAt: "2024-01-01T00:00:00Z",
                userId: "1",
              },
            }),
        });
      }
      if (url.includes("/api/debts?archived=true")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              debts: [
                {
                  id: "debt-1",
                  name: "Old Car Loan",
                  creditor: "Bank of America",
                  originalAmount: 25000,
                  remainingAmount: 5000,
                  interestRate: 4.5,
                  dueDate: null,
                  isArchived: true,
                  isPaidOff: false,
                  paidOffAt: null,
                  createdAt: "2024-01-01T00:00:00Z",
                  updatedAt: "2024-01-01T00:00:00Z",
                  userId: "1",
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Old Car Loan")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /restore/i }));

    // Dialog should never appear — restore happens immediately
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Toast should appear confirming success
    await waitFor(() => {
      expect(screen.getByText("Debt restored successfully")).toBeInTheDocument();
    });
  });
});
