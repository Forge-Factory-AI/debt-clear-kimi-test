import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Login from "@/pages/Login";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Login page", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders login form", () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));
    renderLogin();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
  });

  it("shows inline error for empty email", async () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));
    renderLogin();

    const form = screen.getByRole("button", { name: /sign in/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeDefined();
    });
  });

  it("shows inline error for invalid email format", async () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));
    renderLogin();

    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });

    const form = screen.getByRole("button", { name: /sign in/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeDefined();
    });
  });

  it("shows inline error for empty password", async () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));
    renderLogin();

    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const form = screen.getByRole("button", { name: /sign in/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Password is required")).toBeDefined();
    });
  });

  it("shows generic error on failed login", async () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });

    renderLogin();

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpass" } });

    const form = screen.getByRole("button", { name: /sign in/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeDefined();
    });
  });

  it("redirects on successful login", async () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: "1", email: "test@example.com", name: "Test", createdAt: "2024-01-01" },
      }),
    });

    renderLogin();

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    const form = screen.getByRole("button", { name: /sign in/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/login", expect.any(Object));
    });
  });

  it("has link to register page", () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));
    renderLogin();
    const link = screen.getByText("Create one");
    expect(link).toBeDefined();
    expect(link.closest("a")?.getAttribute("href")).toBe("/register");
  });
});
