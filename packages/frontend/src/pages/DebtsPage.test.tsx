import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import DebtsPage from "./DebtsPage";

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

function mockAuthenticatedWithDebts(debts: unknown[] = []) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/auth/me")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
      });
    }
    if (url.includes("/api/debts") && !url.includes("/payments") && !url.includes("/summary")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ debts }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function renderWithProviders() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <DebtsPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("DebtsPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorageMock.clear();
  });

  it("renders debts heading", async () => {
    mockAuthenticatedWithDebts([]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /debts/i })).toBeInTheDocument();
    });
  });

  it("shows empty state when no debts", async () => {
    mockAuthenticatedWithDebts([]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/no active debts/i)).toBeInTheDocument();
    });
  });

  it("renders debt cards with payment buttons", async () => {
    mockAuthenticatedWithDebts([
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
    ]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    expect(screen.getByText("Bank of America")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log payment/i })).toBeInTheDocument();
  });

  it("shows correct progress percentage", async () => {
    mockAuthenticatedWithDebts([
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
    ]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    // (25000 - 15000) / 25000 = 40%
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("opens payment dialog on Log Payment click", async () => {
    mockAuthenticatedWithDebts([
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
    ]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /log payment/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: /log payment/i })).toBeInTheDocument();
    // Dialog description should contain the creditor
    expect(screen.getByText(/Make a payment toward/)).toBeInTheDocument();
  });

  it("validates amount must be positive", async () => {
    mockAuthenticatedWithDebts([
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
    ]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    // Click first Log Payment button (the one on the debt card)
    fireEvent.click(screen.getAllByRole("button", { name: /log payment/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Submit with empty amount - use the submit button inside the dialog (second match)
    const buttons = screen.getAllByRole("button", { name: /^log payment$/i });
    const submitButton = buttons[buttons.length - 1];
    const form = submitButton.closest("form");
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/amount must be a positive number/i)).toBeInTheDocument();
    });
  });

  it("validates amount is not zero", async () => {
    mockAuthenticatedWithDebts([
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
    ]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /log payment/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "0" } });
    const buttons = screen.getAllByRole("button", { name: /^log payment$/i });
    const submitButton = buttons[buttons.length - 1];
    const form = submitButton.closest("form");
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/amount must be a positive number/i)).toBeInTheDocument();
    });
  });

  it("submits payment and refreshes debts", async () => {
    let paymentCalled = false;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
        });
      }
      if (url.includes("/api/debts/debt-1/payments") && !paymentCalled) {
        paymentCalled = true;
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({
            payment: { id: "pay-1", amount: 5000, note: "Test note", paidAt: "2024-01-15T00:00:00Z", debtId: "debt-1" },
            debt: {
              id: "debt-1",
              name: "Car Loan",
              creditor: "Bank of America",
              originalAmount: 25000,
              remainingAmount: 10000,
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
      if (url.includes("/api/debts") && !url.includes("/payments")) {
        if (paymentCalled) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              debts: [
                {
                  id: "debt-1",
                  name: "Car Loan",
                  creditor: "Bank of America",
                  originalAmount: 25000,
                  remainingAmount: 10000,
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
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
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
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /log payment/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "5000" } });
    fireEvent.change(screen.getByLabelText(/note/i), { target: { value: "Test note" } });

    const buttons = screen.getAllByRole("button", { name: /^log payment$/i });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/debts/debt-1/payments"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("5000"),
        })
      );
    });
  });

  it("shows celebration dialog when debt is paid off", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
        });
      }
      if (url.includes("/api/debts/debt-1/payments")) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({
            payment: { id: "pay-1", amount: 15000, note: null, paidAt: "2024-01-15T00:00:00Z", debtId: "debt-1" },
            debt: {
              id: "debt-1",
              name: "Car Loan",
              creditor: "Bank of America",
              originalAmount: 25000,
              remainingAmount: 0,
              interestRate: 4.5,
              dueDate: null,
              isArchived: false,
              isPaidOff: true,
              paidOffAt: "2024-01-15T00:00:00Z",
              createdAt: "2024-01-01T00:00:00Z",
              updatedAt: "2024-01-01T00:00:00Z",
              userId: "1",
            },
          }),
        });
      }
      if (url.includes("/api/debts")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
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
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /log payment/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "15000" } });

    const buttons = screen.getAllByRole("button", { name: /^log payment$/i });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/congratulations/i)).toBeInTheDocument();
      expect(screen.getByText(/You paid off/)).toBeInTheDocument();
    });
  });

  it("hides Log Payment button for paid-off debts", async () => {
    mockAuthenticatedWithDebts([
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
        paidOffAt: "2024-01-15T00:00:00Z",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        userId: "1",
      },
    ]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /log payment/i })).not.toBeInTheDocument();
  });

  it("shows error on fetch failure", async () => {
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

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/failed to load debts/i)).toBeInTheDocument();
    });
  });

  it("shows skeleton loading state", async () => {
    mockAuthenticatedWithDebts([]);
    renderWithProviders();

    // Skeletons should be present initially before data loads
    expect(document.querySelectorAll("[class*='animate-pulse']").length).toBeGreaterThan(0);
  });

  it("note character counter shows current count", async () => {
    mockAuthenticatedWithDebts([
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
    ]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Car Loan")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /log payment/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/note/i), { target: { value: "Hello" } });

    await waitFor(() => {
      expect(screen.getByText(/\(5\/255\)/)).toBeInTheDocument();
    });
  });
});
