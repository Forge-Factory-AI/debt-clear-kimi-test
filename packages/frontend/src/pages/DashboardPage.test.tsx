import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import DashboardPage from "./DashboardPage";

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
    if (url.includes("/api/debts/summary")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            summary: {
              totalOriginal: 50000,
              totalRemaining: 30000,
              totalPaid: 20000,
              debtCount: 3,
              paidOffCount: 1,
              activeCount: 2,
            },
          }),
      });
    }
    if (url.includes("/api/debts") && !url.includes("/summary")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            debts: [
              {
                id: "debt-1",
                name: "Car Loan",
                creditor: "Bank of America",
                originalAmount: 25000,
                remainingAmount: 15000,
                interestRate: 4.5,
                dueDate: null,
                isArchived: false,
                isPaidOff: false,
                paidOffAt: null,
                createdAt: "2024-01-01T00:00:00Z",
                updatedAt: "2024-01-01T00:00:00Z",
                userId: "1",
              },
              {
                id: "debt-2",
                name: "Student Loan",
                creditor: "Sallie Mae",
                originalAmount: 20000,
                remainingAmount: 5000,
                interestRate: 3.8,
                dueDate: "2025-06-01T00:00:00Z",
                isArchived: false,
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
    if (url.includes("/api/debts/summary")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            summary: {
              totalOriginal: 0,
              totalRemaining: 0,
              totalPaid: 0,
              debtCount: 0,
              paidOffCount: 0,
              activeCount: 0,
            },
          }),
      });
    }
    if (url.includes("/api/debts") && !url.includes("/summary")) {
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
    if (url.includes("/api/debts")) {
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: "Server error" }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function renderWithProviders() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders dashboard heading", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    });
  });

  it("renders summary stats", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Total Debt" })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Total Paid" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Original Amount" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Paid Off" })).toBeInTheDocument();
  });

  it("renders active debt cards", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    expect(screen.getByText("Student Loan")).toBeInTheDocument();
    expect(screen.getByText("Bank of America")).toBeInTheDocument();
    expect(screen.getByText("Sallie Mae")).toBeInTheDocument();
  });

  it("shows correct progress percentages", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    // Car Loan: (25000 - 15000) / 25000 = 40%
    expect(screen.getByText("40%")).toBeInTheDocument();
    // Student Loan: (20000 - 5000) / 20000 = 75%
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("shows empty state when no active debts", async () => {
    mockEmptyState();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/no active debts/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/add your first debt/i)).toBeInTheDocument();
  });

  it("shows error message on fetch failure", async () => {
    mockError();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
    });
  });

  it("renders skeleton loading state", async () => {
    mockAuthenticated();
    renderWithProviders();

    // Skeletons should be present initially before data loads
    expect(document.querySelectorAll("[class*='animate-pulse']").length).toBeGreaterThan(0);
  });

  it("renders manage debts button linking to /debts", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /manage debts/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /manage debts/i })).toHaveAttribute("href", "/debts");
  });

  it("renders progress bars for each debt", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars.length).toBeGreaterThanOrEqual(2);
  });

  it("formats currency amounts correctly", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    // Check that currency-formatted amounts appear in progress text
    // Car Loan: paid = 25000 - 15000 = 10000, original = 25000
    expect(screen.getByText(/\$10,000.*of.*\$25,000/)).toBeInTheDocument();
    // Student Loan: paid = 20000 - 5000 = 15000, original = 20000
    expect(screen.getByText(/\$15,000.*of.*\$20,000/)).toBeInTheDocument();
  });

  it("renders responsive grid layout classes", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    const grid = screen.getByText("Active Debts").closest("div")?.querySelector(".grid");
    expect(grid).toBeTruthy();
  });
});
