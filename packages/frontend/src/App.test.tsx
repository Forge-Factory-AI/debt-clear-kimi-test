import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./App";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function renderWithProviders(initialRoute = "/") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockUnauthenticated() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/auth/me")) {
      return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: "Unauthorized" }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

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
        json: () => Promise.resolve({
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

describe("App routing", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("redirects unauthenticated users to login", async () => {
    mockUnauthenticated();
    renderWithProviders("/");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
    });
  });

  it("redirects authenticated users to dashboard", async () => {
    mockAuthenticated();
    renderWithProviders("/");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    });
  });
});

describe("LoginPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("shows inline validation errors", async () => {
    mockUnauthenticated();
    renderWithProviders("/login");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
    });

    const submitButton = screen.getByRole("button", { name: /log in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });

  it("shows generic error for invalid credentials", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/auth/me")) {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: "Unauthorized" }) });
      }
      if (url.includes("/auth/login")) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: "Invalid credentials" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithProviders("/login");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrongpassword" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("redirects to dashboard after successful login", async () => {
    let loginCalled = false;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/auth/me")) {
        if (loginCalled) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
          });
        }
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: "Unauthorized" }) });
      }
      if (url.includes("/auth/login")) {
        loginCalled = true;
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ user: { id: "1", email: "test@example.com" } }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithProviders("/login");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    });
  });
});

describe("RegisterPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("shows inline validation errors for invalid email", async () => {
    mockUnauthenticated();
    renderWithProviders("/register");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "12345" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "12345" } });

    // Use form submit instead of button click to ensure submission
    const form = screen.getByRole("button", { name: /sign up/i }).closest("form");
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Invalid email format")).toBeInTheDocument();
      expect(screen.getByText("Password must be at least 6 characters")).toBeInTheDocument();
    });
  });

  it("shows duplicate email error", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/auth/me")) {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: "Unauthorized" }) });
      }
      if (url.includes("/auth/register")) {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: () => Promise.resolve({ error: "Email already registered" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithProviders("/register");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText("This email is already registered")).toBeInTheDocument();
    });
  });

  it("redirects to dashboard after successful registration", async () => {
    let registerCalled = false;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/auth/me")) {
        if (registerCalled) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
          });
        }
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: "Unauthorized" }) });
      }
      if (url.includes("/auth/register")) {
        registerCalled = true;
        return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ user: { id: "1", email: "test@example.com" } }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithProviders("/register");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    });
  });
});

describe("Logout", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("logs out and redirects to login", async () => {
    let meCallCount = 0;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/auth/me")) {
        meCallCount++;
        if (meCallCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ user: { id: "1", email: "test@example.com", createdAt: "2024-01-01" } }),
          });
        }
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: "Unauthorized" }) });
      }
      if (url.includes("/auth/logout")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ message: "Logged out" }) });
      }
      if (url.includes("/api/debts/summary")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
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

    renderWithProviders("/dashboard");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    });

    // Open user menu in sidebar
    fireEvent.click(screen.getByRole("button", { name: /test@example.com/i }));

    // Click logout in dropdown
    fireEvent.click(screen.getByRole("menuitem", { name: /log out/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
    });
  });
});

describe("Route protection", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("redirects unauthenticated users from dashboard to login", async () => {
    mockUnauthenticated();
    renderWithProviders("/dashboard");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
    });
  });

  it("redirects authenticated users from login to dashboard", async () => {
    mockAuthenticated();
    renderWithProviders("/login");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    });
  });
});
