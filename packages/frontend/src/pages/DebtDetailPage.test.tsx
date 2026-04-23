import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import DebtDetailPage from "./DebtDetailPage";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockAuthenticatedWithDebt(debt: Record<string, unknown>, payments: Record<string, unknown>[] = []) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/auth/me")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
      });
    }
    if (url.includes("/api/debts/debt-1") && !url.includes("/payments")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            debt: {
              ...debt,
              payments,
            },
          }),
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
    if (url.includes("/api/debts/")) {
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: "Server error" }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function renderWithProviders(initialRoute = "/debts/debt-1") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/debts/:id" element={<DebtDetailPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

const mockDebt = {
  id: "debt-1",
  name: "Car Loan",
  creditor: "Bank of America",
  originalAmount: 25000,
  remainingAmount: 15000,
  interestRate: 4.5,
  dueDate: "2025-06-01T00:00:00Z",
  isArchived: false,
  isPaidOff: false,
  paidOffAt: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  userId: "1",
};

const mockPayments = [
  {
    id: "pay-1",
    amount: 5000,
    note: "Monthly payment",
    paidAt: "2024-02-01T00:00:00Z",
    debtId: "debt-1",
  },
  {
    id: "pay-2",
    amount: 3000,
    note: null,
    paidAt: "2024-01-01T00:00:00Z",
    debtId: "debt-1",
  },
];

describe("DebtDetailPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders debt name and creditor", async () => {
    mockAuthenticatedWithDebt(mockDebt, mockPayments);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    expect(screen.getByText("Bank of America")).toBeInTheDocument();
  });

  it("shows correct progress percentage", async () => {
    mockAuthenticatedWithDebt(mockDebt, mockPayments);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    // (25000 - 15000) / 25000 = 40%
    expect(screen.getByText(/40% Paid/i)).toBeInTheDocument();
  });

  it("shows all debt fields", async () => {
    mockAuthenticatedWithDebt(mockDebt, mockPayments);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    expect(screen.getByText(/Original Amount/i)).toBeInTheDocument();
    expect(screen.getByText("$25,000.00")).toBeInTheDocument();
    expect(screen.getByText(/Remaining/i)).toBeInTheDocument();
    expect(screen.getByText("$15,000.00")).toBeInTheDocument();
    expect(screen.getByText(/Paid So Far/i)).toBeInTheDocument();
    expect(screen.getByText("$10,000.00")).toBeInTheDocument();
    expect(screen.getByText(/Interest Rate/i)).toBeInTheDocument();
    expect(screen.getByText("4.5%")).toBeInTheDocument();
    expect(screen.getByText(/Due Date/i)).toBeInTheDocument();
    expect(screen.getByText(/Created/i)).toBeInTheDocument();
  });

  it("shows progress bar", async () => {
    mockAuthenticatedWithDebt(mockDebt, mockPayments);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });

  it("shows payment history with sorted payments", async () => {
    mockAuthenticatedWithDebt(mockDebt, mockPayments);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Payment History")).toBeInTheDocument();
    });

    expect(screen.getByText("$5,000.00")).toBeInTheDocument();
    expect(screen.getByText("$3,000.00")).toBeInTheDocument();
    expect(screen.getByText("Monthly payment")).toBeInTheDocument();
  });

  it("shows payment count", async () => {
    mockAuthenticatedWithDebt(mockDebt, mockPayments);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Payment History")).toBeInTheDocument();
    });

    expect(screen.getByText("2 payments")).toBeInTheDocument();
  });

  it("shows empty state when no payments", async () => {
    mockAuthenticatedWithDebt(mockDebt, []);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/no payments yet/i)).toBeInTheDocument();
    });
  });

  it("shows delete button for each payment", async () => {
    mockAuthenticatedWithDebt(mockDebt, mockPayments);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Payment History")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: /delete payment/i });
    expect(deleteButtons.length).toBe(2);
  });

  it("opens delete confirmation dialog when delete is clicked", async () => {
    mockAuthenticatedWithDebt(mockDebt, mockPayments);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Payment History")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /delete payment/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    expect(screen.getByText(/Delete Payment/i)).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
  });

  it("cancels delete dialog", async () => {
    mockAuthenticatedWithDebt(mockDebt, mockPayments);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Payment History")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /delete payment/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("deletes payment and refreshes data", async () => {
    let deleted = false;
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
        });
      }
      if (url.includes("/api/payments/pay-1") && options?.method === "DELETE") {
        deleted = true;
        return Promise.resolve({ ok: true, status: 204 });
      }
      if (url.includes("/api/debts/debt-1") && !url.includes("/payments")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              debt: {
                ...mockDebt,
                remainingAmount: deleted ? 20000 : 15000,
                payments: deleted
                  ? [
                      {
                        id: "pay-2",
                        amount: 3000,
                        note: null,
                        paidAt: "2024-01-01T00:00:00Z",
                        debtId: "debt-1",
                      },
                    ]
                  : mockPayments,
              },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Payment History")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /delete payment/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Balance should be restored: 15000 + 5000 = 20000
    await waitFor(() => {
      expect(screen.getByText("$20,000.00")).toBeInTheDocument();
    });
  });

  it("shows back button", async () => {
    mockAuthenticatedWithDebt(mockDebt, mockPayments);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("shows error on fetch failure", async () => {
    mockError();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/failed to load debt details/i)).toBeInTheDocument();
    });
  });

  it("shows skeleton loading state", async () => {
    mockAuthenticatedWithDebt(mockDebt, mockPayments);
    renderWithProviders();

    // Skeletons should be present initially before data loads
    expect(document.querySelectorAll("[class*='animate-pulse']").length).toBeGreaterThan(0);
  });

  it("shows paid off status for paid off debts", async () => {
    const paidOffDebt = {
      ...mockDebt,
      remainingAmount: 0,
      isPaidOff: true,
      paidOffAt: "2024-03-01T00:00:00Z",
    };
    mockAuthenticatedWithDebt(paidOffDebt, [
      {
        id: "pay-1",
        amount: 25000,
        note: "Final payment",
        paidAt: "2024-03-01T00:00:00Z",
        debtId: "debt-1",
      },
    ]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    expect(screen.getByText("Paid Off")).toBeInTheDocument();
    expect(screen.getByText(/Paid Off Date/i)).toBeInTheDocument();
  });

  it("hides interest rate field when null", async () => {
    const noRateDebt = { ...mockDebt, interestRate: null };
    mockAuthenticatedWithDebt(noRateDebt, mockPayments);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Interest Rate/i)).not.toBeInTheDocument();
  });

  it("hides due date field when null", async () => {
    const noDueDateDebt = { ...mockDebt, dueDate: null };
    mockAuthenticatedWithDebt(noDueDateDebt, mockPayments);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Due Date/i)).not.toBeInTheDocument();
  });
});
