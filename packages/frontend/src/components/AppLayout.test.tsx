import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "./AppLayout";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function renderWithProviders(initialRoute = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <AppLayout>
          <div>Test content</div>
        </AppLayout>
      </AuthProvider>
    </MemoryRouter>
  );
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
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

describe("AppLayout", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders sidebar with navigation links", async () => {
    mockAuthenticated();
    renderWithProviders("/dashboard");

    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: /main navigation/i })).toBeInTheDocument();
    });

    // Use getAllByRole since links appear in both desktop and mobile (mobile header)
    expect(screen.getAllByRole("link", { name: /dashboard/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /debts/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /achievements/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /archived/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("highlights active page", async () => {
    mockAuthenticated();
    renderWithProviders("/dashboard");

    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: /dashboard/i })[0]).toBeInTheDocument();
    });

    // Get the first (desktop sidebar) dashboard link
    const dashboardLink = screen.getAllByRole("link", { name: /dashboard/i })[0];
    // Check it has aria-current="page" which NavLink sets for active routes
    expect(dashboardLink).toHaveAttribute("aria-current", "page");

    // Get the first debts link - should NOT be active
    const debtsLink = screen.getAllByRole("link", { name: /debts/i })[0];
    expect(debtsLink).not.toHaveAttribute("aria-current", "page");
  });

  it("app name links to dashboard", async () => {
    mockAuthenticated();
    renderWithProviders("/debts");

    await waitFor(() => {
      expect(screen.getAllByText("DebtClear").length).toBeGreaterThanOrEqual(1);
    });

    // Get all DebtClear links - desktop sidebar and mobile header
    const appNameLinks = screen.getAllByText("DebtClear").map((el) => el.closest("a"));
    for (const link of appNameLinks) {
      expect(link).toHaveAttribute("href", "/dashboard");
    }
  });

  it("shows user email in user menu", async () => {
    mockAuthenticated();
    renderWithProviders("/dashboard");

    await waitFor(() => {
      expect(screen.getAllByText("test@example.com").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("logs out from user menu", async () => {
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
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithProviders("/dashboard");

    await waitFor(() => {
      expect(screen.getAllByText("test@example.com").length).toBeGreaterThanOrEqual(1);
    });

    // Open user menu by clicking the first button containing the email (desktop sidebar)
    const userMenuButton = screen.getAllByText("test@example.com")[0].closest("button");
    expect(userMenuButton).toBeInTheDocument();
    fireEvent.click(userMenuButton!);

    // Click logout in dropdown
    const logoutButton = screen.getByRole("menuitem", { name: /log out/i });
    fireEvent.click(logoutButton);

    // After logout, the component should redirect (ProtectedRoute kicks in)
    // The auth state changes cause a re-render; we verify fetch was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/auth/logout"), expect.any(Object));
    });
  });

  it("has touch targets at least 44px", async () => {
    mockAuthenticated();
    renderWithProviders("/dashboard");

    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: /dashboard/i })[0]).toBeInTheDocument();
    });

    // Check desktop sidebar nav links for min-h-[44px] class
    const dashboardLink = screen.getAllByRole("link", { name: /dashboard/i })[0];
    expect(dashboardLink.className).toContain("min-h-[44px]");
  });

  it("renders mobile hamburger button", async () => {
    mockAuthenticated();
    renderWithProviders("/dashboard");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /open menu/i })).toBeInTheDocument();
    });
  });

  it("toggles mobile menu on hamburger click", async () => {
    mockAuthenticated();
    renderWithProviders("/dashboard");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /open menu/i })).toBeInTheDocument();
    });

    const menuButton = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(menuButton);

    // After clicking, the close button should appear
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /close menu/i })).toBeInTheDocument();
    });

    // The mobile sidebar should be visible
    expect(screen.getByLabelText(/mobile sidebar/i)).toBeInTheDocument();
  });
});
