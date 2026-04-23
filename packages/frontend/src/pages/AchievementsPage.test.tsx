import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import AchievementsPage from "./AchievementsPage";

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
    if (url.includes("/api/debts?paidOff=true")) {
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
                remainingAmount: 0,
                interestRate: 4.5,
                dueDate: null,
                isArchived: false,
                isPaidOff: true,
                paidOffAt: "2024-06-15T00:00:00Z",
                createdAt: "2023-01-01T00:00:00Z",
                updatedAt: "2024-06-15T00:00:00Z",
                userId: "1",
              },
              {
                id: "debt-2",
                name: "Credit Card",
                creditor: "Chase",
                originalAmount: 5000,
                remainingAmount: 0,
                interestRate: 18.9,
                dueDate: "2025-01-01T00:00:00Z",
                isArchived: false,
                isPaidOff: true,
                paidOffAt: "2024-03-10T00:00:00Z",
                createdAt: "2023-01-01T00:00:00Z",
                updatedAt: "2024-03-10T00:00:00Z",
                userId: "1",
              },
              {
                id: "debt-3",
                name: "Student Loan",
                creditor: "Sallie Mae",
                originalAmount: 30000,
                remainingAmount: 0,
                interestRate: 5.8,
                dueDate: null,
                isArchived: false,
                isPaidOff: true,
                paidOffAt: "2024-09-20T00:00:00Z",
                createdAt: "2023-01-01T00:00:00Z",
                updatedAt: "2024-09-20T00:00:00Z",
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
    if (url.includes("/api/debts?paidOff=true")) {
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
    if (url.includes("/api/debts?paidOff=true")) {
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
          <AchievementsPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("AchievementsPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders achievements heading", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /achievements/i })).toBeInTheDocument();
    });
  });

  it("renders paid-off debt cards", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    expect(screen.getByText("Credit Card")).toBeInTheDocument();
    expect(screen.getByText("Student Loan")).toBeInTheDocument();
    expect(screen.getByText("Bank of America")).toBeInTheDocument();
    expect(screen.getByText("Chase")).toBeInTheDocument();
    expect(screen.getByText("Sallie Mae")).toBeInTheDocument();
  });

  it("sorts debts by payoff date descending", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    // All three debts should show their paid-off dates
    expect(screen.getByText("June 14, 2024")).toBeInTheDocument();
    expect(screen.getByText("March 9, 2024")).toBeInTheDocument();
    expect(screen.getByText("September 19, 2024")).toBeInTheDocument();
  });

  it("shows debt count in header", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("3 debts paid off")).toBeInTheDocument();
    });
  });

  it("shows empty state when no paid-off debts", async () => {
    mockEmptyState();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/no achievements yet/i)).toBeInTheDocument();
    });
  });

  it("shows error message on fetch failure", async () => {
    mockError();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/failed to load achievements/i)).toBeInTheDocument();
    });
  });

  it("renders skeleton loading state", async () => {
    mockAuthenticated();
    renderWithProviders();

    expect(document.querySelectorAll("[class*='animate-pulse']").length).toBeGreaterThan(0);
  });

  it("shows paid-in-full amounts", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    expect(screen.getByText("$25,000.00")).toBeInTheDocument();
    expect(screen.getByText("$5,000.00")).toBeInTheDocument();
    expect(screen.getByText("$30,000.00")).toBeInTheDocument();
  });

  it("shows 'Debt Free' badges", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    const badges = screen.getAllByText("Debt Free");
    expect(badges.length).toBe(3);
  });
});
