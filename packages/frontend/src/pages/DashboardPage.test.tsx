import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
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
        <ToastProvider>
          <DashboardPage />
        </ToastProvider>
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

    const grid = document.querySelector(".grid.gap-4.sm\\:grid-cols-2");
    expect(grid).toBeTruthy();
  });

  it("renders Add Debt button", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add debt/i })).toBeInTheDocument();
    });
  });

  it("opens add dialog when Add Debt button is clicked", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add debt/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add debt/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText("Add New Debt")).toBeInTheDocument();
  });

  it("opens edit dialog when debt card is clicked", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/edit car loan/i));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText("Edit Debt")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Car Loan")).toBeInTheDocument();
  });

  it("closes dialog and discards on cancel", async () => {
    mockAuthenticated();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add debt/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add debt/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("creates a debt and refreshes dashboard", async () => {
    let created = false;
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
      if (url === "/api/debts" && method === "POST") {
        created = true;
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              debt: {
                id: "debt-new",
                name: "New Debt",
                creditor: "New Bank",
                originalAmount: 10000,
                remainingAmount: 10000,
                interestRate: null,
                dueDate: null,
                isArchived: false,
                isPaidOff: false,
                paidOffAt: null,
                createdAt: "2024-01-02T00:00:00Z",
                updatedAt: "2024-01-02T00:00:00Z",
                userId: "1",
              },
            }),
        });
      }
      if (url === "/api/debts" && !created) {
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
              ],
            }),
        });
      }
      if (url === "/api/debts" && created) {
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
                  id: "debt-new",
                  name: "New Debt",
                  creditor: "New Bank",
                  originalAmount: 10000,
                  remainingAmount: 10000,
                  interestRate: null,
                  dueDate: null,
                  isArchived: false,
                  isPaidOff: false,
                  paidOffAt: null,
                  createdAt: "2024-01-02T00:00:00Z",
                  updatedAt: "2024-01-02T00:00:00Z",
                  userId: "1",
                },
              ],
            }),
        });
      }
      if (url.includes("/api/debts/summary") && !created) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              summary: {
                totalOriginal: 25000,
                totalRemaining: 15000,
                totalPaid: 10000,
                debtCount: 1,
                paidOffCount: 0,
                activeCount: 1,
              },
            }),
        });
      }
      if (url.includes("/api/debts/summary") && created) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              summary: {
                totalOriginal: 35000,
                totalRemaining: 25000,
                totalPaid: 10000,
                debtCount: 2,
                paidOffCount: 0,
                activeCount: 2,
              },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add debt/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add debt/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/debt name/i), { target: { value: "New Debt" } });
    fireEvent.change(screen.getByLabelText(/creditor/i), { target: { value: "New Bank" } });
    fireEvent.change(screen.getByLabelText(/original amount/i), { target: { value: "10000" } });

    const submitButton = screen.getAllByRole("button", { name: /add debt/i }).find(
      (b) => b.getAttribute("type") === "submit"
    );
    expect(submitButton).toBeTruthy();
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("New Debt")).toBeInTheDocument();
    });
  });

  it("empty state Add Your First Debt button opens add dialog", async () => {
    mockEmptyState();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/no active debts/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add your first debt/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText("Add New Debt")).toBeInTheDocument();
  });
});
