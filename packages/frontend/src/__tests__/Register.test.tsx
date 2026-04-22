import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Register from "@/pages/Register";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function renderRegister() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Register />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Register page", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders registration form", () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));
    renderRegister();
    expect(screen.getByLabelText(/Name/i)).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByRole("button", { name: /create account/i })).toBeDefined();
  });

  it("shows inline error for empty email", async () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));
    renderRegister();

    const form = screen.getByRole("button", { name: /create account/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeDefined();
    });
  });

  it("shows inline error for invalid email format", async () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));
    renderRegister();

    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });

    const form = screen.getByRole("button", { name: /create account/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeDefined();
    });
  });

  it("shows inline error for short password", async () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));
    renderRegister();

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "123" } });

    const form = screen.getByRole("button", { name: /create account/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 6 characters")).toBeDefined();
    });
  });

  it("shows duplicate email error inline", async () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Email already registered" }),
    });

    renderRegister();

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    fireEvent.change(emailInput, { target: { value: "taken@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    const form = screen.getByRole("button", { name: /create account/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("This email is already registered")).toBeDefined();
    });
  });

  it("redirects on successful registration", async () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: "1", email: "new@example.com", name: "New User", createdAt: "2024-01-01" },
      }),
    });

    renderRegister();

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    fireEvent.change(emailInput, { target: { value: "new@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    const form = screen.getByRole("button", { name: /create account/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/register", expect.any(Object));
    });
  });

  it("has link to login page", () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));
    renderRegister();
    const link = screen.getByText("Sign in");
    expect(link).toBeDefined();
    expect(link.closest("a")?.getAttribute("href")).toBe("/login");
  });
});
